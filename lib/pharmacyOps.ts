import { query } from '@/lib/db';
import { approveAllPending, dispenseCycle, listRefills } from '@/lib/refills';

export async function processPharmacyBatch(opts: {
  period?: string;
  cycleIds?: string[];
  actor?: string;
  notes?: string;
}) {
  const actor = opts.actor || 'pharmacy-batch';
  const notes = opts.notes || 'صرف صيدلية — دفعة تلقائية';

  let cycleIds = opts.cycleIds;
  if (!cycleIds || cycleIds.length === 0) {
    const rows = await listRefills({
      period: opts.period,
      limit: 200,
    });
    cycleIds = (rows as any[])
      .filter((r) =>
        ['in_review', 'approved', 'partially_approved', 'dispensing'].includes(
          r.status
        )
      )
      .map((r) => r.id as string);
  }

  const results: Array<{
    cycle_id: string;
    ok: boolean;
    status?: string;
    error?: string;
  }> = [];

  for (const id of cycleIds) {
    try {
      const detail = await query<{ status: string }>(
        `SELECT status FROM refill_cycles WHERE id = $1`,
        [id]
      );
      const st = detail.rows[0]?.status;
      if (!st) {
        results.push({ cycle_id: id, ok: false, error: 'not found' });
        continue;
      }

      if (st === 'in_review') {
        await approveAllPending(id, actor);
      }

      const after = await query<{ status: string }>(
        `SELECT status FROM refill_cycles WHERE id = $1`,
        [id]
      );
      const st2 = after.rows[0]?.status;

      if (['approved', 'partially_approved', 'dispensing'].includes(st2 || '')) {
        await dispenseCycle({ cycleId: id, notes, actor });
        try {
          const { writeAudit } = await import('@/lib/audit');
          await writeAudit({
            actor,
            action: 'pharmacy.dispensed',
            entity_type: 'refill_cycle',
            entity_id: id,
            meta: { notes },
          });
        } catch {
          /* */
        }
        results.push({ cycle_id: id, ok: true, status: 'dispensed' });
      } else if (st2 === 'dispensed') {
        results.push({ cycle_id: id, ok: true, status: 'already_dispensed' });
      } else {
        results.push({
          cycle_id: id,
          ok: false,
          status: st2,
          error: `cannot dispense from ${st2}`,
        });
      }
    } catch (e: unknown) {
      results.push({
        cycle_id: id,
        ok: false,
        error: e instanceof Error ? e.message : 'failed',
      });
    }
  }

  return {
    processed: results.length,
    ok_count: results.filter((r) => r.ok).length,
    results,
  };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export type PharmacyCsvImportRow = {
  period: string;
  line_code: string;
  program_code: string;
  employee_id: string;
  drug_name: string;
  claim_id: string;
  dispensed_qty: number | null;
  qty: number | null;
  item_status: string;
};

export function parsePharmacyPickListCsv(text: string): PharmacyCsvImportRow[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(normHeader);
  const idx = (name: string) => headers.indexOf(name);

  const iPeriod = idx('period');
  const iLine = idx('line_code');
  const iProg = idx('program_code');
  const iEmp = idx('employee_id');
  const iDrug = idx('drug_name');
  const iClaim = idx('claim_id');
  const iDisp = idx('dispensed_qty');
  const iQty = idx('qty');
  const iStatus = idx('item_status');

  const rows: PharmacyCsvImportRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]);
    const get = (i: number) => (i >= 0 && i < cells.length ? cells[i] : '');
    const num = (s: string): number | null => {
      if (!s || !s.trim()) return null;
      const n = Number(String(s).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const line_code = get(iLine);
    if (!line_code && !get(iDrug)) continue;
    rows.push({
      period: get(iPeriod),
      line_code,
      program_code: get(iProg),
      employee_id: get(iEmp),
      drug_name: get(iDrug),
      claim_id: get(iClaim),
      dispensed_qty: num(get(iDisp)),
      qty: num(get(iQty)),
      item_status: get(iStatus),
    });
  }
  return rows;
}

export type PharmacyImportResult = {
  rows_read: number;
  updated: number;
  skipped: number;
  cycles_touched: string[];
  errors: string[];
  details: Array<{ line_code: string; ok: boolean; message?: string }>;
};

export async function importPharmacyCsv(
  csvText: string,
  opts: { actor?: string; markItemDispensed?: boolean } = {}
): Promise<PharmacyImportResult> {
  const rows = parsePharmacyPickListCsv(csvText);
  const mark = opts.markItemDispensed !== false;
  const result: PharmacyImportResult = {
    rows_read: rows.length,
    updated: 0,
    skipped: 0,
    cycles_touched: [],
    errors: [],
    details: [],
  };
  const cycles = new Set<string>();

  for (const row of rows) {
    const disp =
      row.dispensed_qty != null
        ? row.dispensed_qty
        : row.qty != null
          ? row.qty
          : null;

    if (disp == null && !row.item_status) {
      result.skipped += 1;
      result.details.push({
        line_code: row.line_code || row.drug_name,
        ok: false,
        message: 'no dispensed_qty/qty',
      });
      continue;
    }

    try {
      let found: { id: string; cycle_id: string } | undefined;

      if (row.line_code && row.period) {
        const q = await query<{ id: string; cycle_id: string }>(
          `SELECT ri.id, rc.id AS cycle_id
           FROM refill_items ri
           JOIN refill_cycles rc ON rc.id = ri.refill_cycle_id
           WHERE ri.line_code = $1 AND rc.period = $2
           LIMIT 1`,
          [row.line_code, row.period]
        );
        found = q.rows[0];
      }

      if (!found && row.line_code) {
        const q = await query<{ id: string; cycle_id: string }>(
          `SELECT ri.id, rc.id AS cycle_id
           FROM refill_items ri
           JOIN refill_cycles rc ON rc.id = ri.refill_cycle_id
           WHERE ri.line_code = $1
           ORDER BY rc.period DESC
           LIMIT 1`,
          [row.line_code]
        );
        found = q.rows[0];
      }

      if (!found && row.program_code && row.drug_name) {
        const q = await query<{ id: string; cycle_id: string }>(
          `SELECT ri.id, rc.id AS cycle_id
           FROM refill_items ri
           JOIN refill_cycles rc ON rc.id = ri.refill_cycle_id
           JOIN chronic_programs cp ON cp.id = rc.program_id
           WHERE cp.program_code = $1
             AND lower(ri.drug_name) = lower($2)
             AND ($3::text IS NULL OR $3 = '' OR rc.period = $3)
           ORDER BY rc.period DESC
           LIMIT 1`,
          [row.program_code, row.drug_name, row.period || null]
        );
        found = q.rows[0];
      }

      if (!found) {
        result.skipped += 1;
        result.details.push({
          line_code: row.line_code || row.drug_name,
          ok: false,
          message: 'not found in DB',
        });
        continue;
      }

      const status =
        mark || /dispensed|صرف/i.test(row.item_status)
          ? 'dispensed'
          : row.item_status || null;

      if (disp != null && status) {
        await query(
          `UPDATE refill_items
           SET dispensed_qty = $1, status = $2
           WHERE id = $3`,
          [disp, status, found.id]
        );
      } else if (disp != null) {
        await query(
          `UPDATE refill_items SET dispensed_qty = $1 WHERE id = $2`,
          [disp, found.id]
        );
      } else if (status) {
        await query(`UPDATE refill_items SET status = $1 WHERE id = $2`, [
          status,
          found.id,
        ]);
      }

      cycles.add(found.cycle_id);
      result.updated += 1;
      result.details.push({
        line_code: row.line_code || row.drug_name,
        ok: true,
        message: `updated → ${disp ?? status}`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'update failed';
      result.errors.push(msg);
      result.skipped += 1;
      result.details.push({
        line_code: row.line_code || row.drug_name,
        ok: false,
        message: msg,
      });
    }
  }

  result.cycles_touched = [...cycles];

  for (const cycleId of cycles) {
    try {
      const check = await query<{ pending: string }>(
        `SELECT count(*)::text AS pending FROM refill_items
         WHERE refill_cycle_id = $1
           AND coalesce(status,'') NOT IN ('dispensed', 'cancelled', 'rejected')`,
        [cycleId]
      );
      if (check.rows[0] && Number(check.rows[0].pending) === 0) {
        await query(
          `UPDATE refill_cycles
           SET status = 'dispensed',
               updated_at = now()
           WHERE id = $1 AND status <> 'dispensed'`,
          [cycleId]
        );
      }
    } catch {
      /* non-fatal */
    }
  }

  return result;
}
