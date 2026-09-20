import { query } from '@/lib/db';

function skuFromName(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `SKU-${base || 'UNKNOWN'}`;
}

/** Find or create SKU by drug name (case-insensitive). */
export async function ensureSku(drugName: string, opts?: { min_qty?: number; unit?: string }) {
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
    `INSERT INTO inventory_skus (sku_code, drug_name, unit, min_qty)
     VALUES ($1, $2, $3, $4)
     RETURNING id, sku_code`,
    [code, name, opts?.unit || 'pack', opts?.min_qty ?? 2]
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
  qty_available: number;
  is_low: boolean;
  is_active: boolean;
};

export async function listStock(opts?: {
  lowOnly?: boolean;
  q?: string;
}): Promise<StockRow[]> {
  const params: unknown[] = [];
  const where = ['s.is_active = true'];

  if (opts?.q) {
    params.push(`%${opts.q}%`);
    where.push(
      `(s.drug_name ILIKE $${params.length} OR s.sku_code ILIKE $${params.length})`
    );
  }

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
     WHERE ${where.join(' AND ')}
     ORDER BY
       CASE WHEN coalesce(b.qty_on_hand, 0) <= s.min_qty THEN 0 ELSE 1 END,
       s.drug_name`,
    params
  );

  let rows = (res.rows as any[]).map((r) => {
    const onHand = Number(r.qty_on_hand) || 0;
    const reserved = Number(r.qty_reserved) || 0;
    const minQty = Number(r.min_qty) || 0;
    return {
      id: r.id,
      sku_code: r.sku_code,
      drug_name: r.drug_name,
      unit: r.unit,
      min_qty: minQty,
      qty_on_hand: onHand,
      qty_reserved: reserved,
      qty_available: onHand - reserved,
      is_low: onHand <= minQty,
      is_active: !!r.is_active,
    };
  });

  if (opts?.lowOnly) rows = rows.filter((r) => r.is_low);
  return rows;
}

export async function listMoves(opts: {
  skuId?: string;
  move_type?: string;
  limit?: number;
}) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const params: unknown[] = [];
  const where: string[] = [];

  if (opts.skuId) {
    params.push(opts.skuId);
    where.push(`m.sku_id = $${params.length}`);
  }
  if (opts.move_type) {
    params.push(opts.move_type);
    where.push(`m.move_type = $${params.length}::inventory_move_type`);
  }
  params.push(limit);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const res = await query(
    `SELECT m.*, s.drug_name, s.sku_code
     FROM inventory_moves m
     JOIN inventory_skus s ON s.id = m.sku_id
     ${whereSql}
     ORDER BY m.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return res.rows;
}

export async function updateSkuMeta(input: {
  skuId: string;
  min_qty?: number;
  unit?: string;
  is_active?: boolean;
  notes?: string;
}) {
  await query(
    `UPDATE inventory_skus SET
       min_qty = COALESCE($2, min_qty),
       unit = COALESCE($3, unit),
       is_active = COALESCE($4, is_active),
       notes = COALESCE($5, notes),
       updated_at = now()
     WHERE id = $1`,
    [
      input.skuId,
      input.min_qty ?? null,
      input.unit ?? null,
      input.is_active ?? null,
      input.notes ?? null,
    ]
  );
  return listStock();
}

/**
 * Apply stock movement. qty is absolute quantity moved (always positive).
 * receive/return → +qty; dispense/write_off → -qty; adjust uses signedQty.
 */
export async function applyMove(input: {
  drugName?: string;
  skuId?: string;
  move_type: 'receive' | 'dispense' | 'adjust' | 'return' | 'write_off';
  qty: number;
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

/** Seed SKUs from distinct active chronic med lines (qty starts at 0). */
export async function seedSkusFromFormulary() {
  const meds = await query<{ drug: string }>(
    `SELECT DISTINCT coalesce(nullif(trim(matched_name), ''), requested_name) AS drug
     FROM chronic_med_lines
     WHERE is_active = true
       AND coalesce(nullif(trim(matched_name), ''), requested_name) IS NOT NULL
     ORDER BY 1`
  );

  let created = 0;
  let existing = 0;
  for (const row of meds.rows) {
    const name = String(row.drug || '').trim();
    if (!name) continue;
    const before = await query(
      `SELECT id FROM inventory_skus WHERE lower(trim(drug_name)) = lower(trim($1))`,
      [name]
    );
    await ensureSku(name, { min_qty: 2 });
    if (before.rows.length) existing += 1;
    else created += 1;
  }

  return { scanned: meds.rows.length, created, existing };
}

export async function applyDispenseToInventory(cycleId: string, actor?: string) {
  const items = await query<{
    id: string;
    drug_name: string;
    dispensed_qty: string | null;
    qty: string;
  }>(
    `SELECT id, drug_name, dispensed_qty, qty
     FROM refill_items
     WHERE refill_cycle_id = $1 AND status = 'dispensed'`,
    [cycleId]
  );

  const results: Array<{
    item_id: string;
    drug_name: string;
    ok: boolean;
    error?: string;
  }> = [];

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

export function stockToCsv(rows: StockRow[]): string {
  const headers = [
    'sku_code',
    'drug_name',
    'qty_on_hand',
    'qty_reserved',
    'qty_available',
    'min_qty',
    'unit',
    'is_low',
  ];
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.sku_code,
        r.drug_name,
        r.qty_on_hand,
        r.qty_reserved,
        r.qty_available,
        r.min_qty,
        r.unit,
        r.is_low,
      ]
        .map(esc)
        .join(',')
    );
  }
  return lines.join('\n');
}

export async function inventorySummary() {
  const stock = await listStock();
  return {
    skus: stock.length,
    low_count: stock.filter((s) => s.is_low).length,
    total_units: stock.reduce((a, s) => a + s.qty_on_hand, 0),
    zero_stock: stock.filter((s) => s.qty_on_hand <= 0).length,
  };
}
