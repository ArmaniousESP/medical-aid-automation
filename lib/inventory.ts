import { query } from '@/lib/db';

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function skuFromName(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `SKU-${base || 'UNKNOWN'}`;
}

/** Find or create SKU by drug name (case-insensitive). */
export async function ensureSku(drugName: string) {
  const name = drugName.trim();
  const existing = await query<{ id: string; sku_code: string }>(
    `SELECT id, sku_code FROM inventory_skus
     WHERE lower(trim(drug_name)) = lower(trim($1))
     LIMIT 1`,
    [name]
  );
  if (existing.rows[0]) return existing.rows[0];

  let code = skuFromName(name);
  const clash = await query(`SELECT 1 FROM inventory_skus WHERE sku_code = $1`, [code]);
  if (clash.rows.length) {
    code = `${code}-${Date.now().toString(36).slice(-4)}`;
  }

  const ins = await query<{ id: string; sku_code: string }>(
    `INSERT INTO inventory_skus (sku_code, drug_name)
     VALUES ($1, $2)
     RETURNING id, sku_code`,
    [code, name]
  );
  const sku = ins.rows[0];
  await query(
    `INSERT INTO inventory_balances (sku_id, qty_on_hand)
     VALUES ($1, 0)
     ON CONFLICT (sku_id) DO NOTHING`,
    [sku.id]
  );
  return sku;
}

export type StockRow = {
  id: string;
  sku_code: string;
  drug_name: string;
  unit: string;
  min_qty: number;
  qty_on_hand: number;
  qty_reserved: number;
  is_low: boolean;
  is_active: boolean;
};

export async function listStock(): Promise<StockRow[]> {
  const res = await query(
    `SELECT
       s.id,
       s.sku_code,
       s.drug_name,
       s.unit,
       s.min_qty,
       s.is_active,
       coalesce(b.qty_on_hand, 0) AS qty_on_hand,
       coalesce(b.qty_reserved, 0) AS qty_reserved
     FROM inventory_skus s
     LEFT JOIN inventory_balances b ON b.sku_id = s.id
     WHERE s.is_active
     ORDER BY s.drug_name`
  );
  return (res.rows as any[]).map((r) => {
    const onHand = Number(r.qty_on_hand) || 0;
    const minQty = Number(r.min_qty) || 0;
    return {
      id: r.id,
      sku_code: r.sku_code,
      drug_name: r.drug_name,
      unit: r.unit,
      min_qty: minQty,
      qty_on_hand: onHand,
      qty_reserved: Number(r.qty_reserved) || 0,
      is_low: onHand <= minQty,
      is_active: !!r.is_active,
    };
  });
}

export async function listMoves(opts: { skuId?: string; limit?: number }) {
  const limit = Math.min(opts.limit ?? 50, 200);
  if (opts.skuId) {
    const res = await query(
      `SELECT m.*, s.drug_name, s.sku_code
       FROM inventory_moves m
       JOIN inventory_skus s ON s.id = m.sku_id
       WHERE m.sku_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2`,
      [opts.skuId, limit]
    );
    return res.rows;
  }
  const res = await query(
    `SELECT m.*, s.drug_name, s.sku_code
     FROM inventory_moves m
     JOIN inventory_skus s ON s.id = m.sku_id
     ORDER BY m.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

/**
 * Apply stock movement. qty is absolute quantity moved (always positive).
 * receive/return → +qty; dispense/write_off → -qty; adjust uses signed qty in notes or positive with type.
 */
export async function applyMove(input: {
  drugName?: string;
  skuId?: string;
  move_type: 'receive' | 'dispense' | 'adjust' | 'return' | 'write_off';
  qty: number;
  /** For adjust: positive or negative signed delta */
  signedQty?: number;
  ref_type?: string;
  ref_id?: string;
  actor?: string;
  notes?: string;
}) {
  if (!input.skuId && !input.drugName) {
    throw new Error('skuId or drugName required');
  }
  const sku = input.skuId
    ? (
        await query<{ id: string }>(`SELECT id FROM inventory_skus WHERE id = $1`, [
          input.skuId,
        ])
      ).rows[0]
    : await ensureSku(input.drugName!);

  if (!sku) throw new Error('SKU not found');

  let delta = 0;
  if (input.move_type === 'adjust') {
    delta = input.signedQty != null ? Number(input.signedQty) : Number(input.qty);
  } else if (input.move_type === 'receive' || input.move_type === 'return') {
    delta = Math.abs(Number(input.qty));
  } else {
    delta = -Math.abs(Number(input.qty));
  }

  if (!delta && input.move_type !== 'adjust') {
    throw new Error('qty must be non-zero');
  }

  await query(
    `INSERT INTO inventory_balances (sku_id, qty_on_hand)
     VALUES ($1, 0)
     ON CONFLICT (sku_id) DO NOTHING`,
    [sku.id]
  );

  const bal = await query<{ qty_on_hand: string }>(
    `UPDATE inventory_balances
     SET qty_on_hand = qty_on_hand + $2, updated_at = now()
     WHERE sku_id = $1
     RETURNING qty_on_hand`,
    [sku.id, delta]
  );
  const balanceAfter = Number(bal.rows[0]?.qty_on_hand) || 0;

  await query(
    `INSERT INTO inventory_moves (
       sku_id, move_type, qty, balance_after, ref_type, ref_id, actor, notes
     ) VALUES ($1, $2::inventory_move_type, $3, $4, $5, $6, $7, $8)`,
    [
      sku.id,
      input.move_type,
      Math.abs(delta),
      balanceAfter,
      input.ref_type ?? null,
      input.ref_id ?? null,
      input.actor ?? null,
      input.notes ?? null,
    ]
  );

  return { sku_id: sku.id, balance_after: balanceAfter, delta };
}

/** Deduct stock for each dispensed item on a cycle (idempotent per item). */
export async function applyDispenseToInventory(cycleId: string, actor?: string) {
  const items = await query<{ id: string; drug_name: string; dispensed_qty: string | null; qty: string }>(
    `SELECT id, drug_name, dispensed_qty, qty
     FROM refill_items
     WHERE refill_cycle_id = $1 AND status = 'dispensed'`,
    [cycleId]
  );

  const results: Array<{ item_id: string; drug_name: string; ok: boolean; error?: string }> = [];

  for (const item of items.rows) {
    const already = await query(
      `SELECT 1 FROM inventory_moves
       WHERE ref_type = 'refill_item' AND ref_id = $1 AND move_type = 'dispense'
       LIMIT 1`,
      [item.id]
    );
    if (already.rows.length) {
      results.push({ item_id: item.id, drug_name: item.drug_name, ok: true });
      continue;
    }

    const qty = Number(item.dispensed_qty) || Number(item.qty) || 1;
    try {
      await applyMove({
        drugName: item.drug_name,
        move_type: 'dispense',
        qty,
        ref_type: 'refill_item',
        ref_id: item.id,
        actor: actor || 'dispense',
        notes: `صرف دورة ${cycleId}`,
      });
      results.push({ item_id: item.id, drug_name: item.drug_name, ok: true });
    } catch (e: unknown) {
      results.push({
        item_id: item.id,
        drug_name: item.drug_name,
        ok: false,
        error: e instanceof Error ? e.message : 'failed',
      });
    }
  }

  return results;
}
