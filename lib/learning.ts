import { query } from '@/lib/db';

export type LearnedOption = {
  value: string;
  label: string;
  sublabel?: string;
  hits: number;
};

export async function ensureLearningTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS usage_signals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      signal_key TEXT NOT NULL,
      value TEXT NOT NULL,
      label TEXT,
      hits INT NOT NULL DEFAULT 1,
      weight NUMERIC NOT NULL DEFAULT 1,
      last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (signal_key, value)
    )`);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_usage_signals_key_hits
     ON usage_signals (signal_key, hits DESC, last_seen DESC)`
  );
}

function normValue(v: string) {
  return v.trim().replace(/\s+/g, ' ');
}

/** Record a selection / free-text entry so future suggestions improve. */
export async function recordSignal(opts: {
  key: string;
  value: string;
  label?: string;
  weight?: number;
}) {
  const value = normValue(opts.value);
  if (!opts.key || !value || value.length < 1) {
    return { ok: false as const, reason: 'empty' };
  }
  const key = opts.key.trim().toLowerCase();
  const label = (opts.label || value).trim();
  const weight = Math.min(Math.max(opts.weight ?? 1, 0.1), 10);

  await ensureLearningTables();
  await query(
    `INSERT INTO usage_signals (signal_key, value, label, hits, weight, last_seen)
     VALUES ($1, $2, $3, 1, $4, now())
     ON CONFLICT (signal_key, value) DO UPDATE SET
       hits = usage_signals.hits + 1,
       weight = usage_signals.weight + EXCLUDED.weight,
       label = COALESCE(NULLIF(EXCLUDED.label, ''), usage_signals.label),
       last_seen = now()`,
    [key, value, label, weight]
  );
  return { ok: true as const };
}

/** Ranked suggestions for a field; optional prefix filter. */
export async function suggestFromLearning(opts: {
  key: string;
  q?: string;
  limit?: number;
}): Promise<LearnedOption[]> {
  const key = opts.key.trim().toLowerCase();
  const limit = Math.min(opts.limit ?? 12, 40);
  const q = (opts.q || '').trim();

  await ensureLearningTables();

  const params: unknown[] = [key];
  let where = `signal_key = $1`;
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (value ILIKE $${params.length} OR label ILIKE $${params.length})`;
  }
  params.push(limit);

  const res = await query<{ value: string; label: string | null; hits: number }>(
    `SELECT value, label, hits
     FROM usage_signals
     WHERE ${where}
     ORDER BY hits DESC, last_seen DESC
     LIMIT $${params.length}`,
    params
  );

  return res.rows.map((r) => ({
    value: r.value,
    label: r.label || r.value,
    sublabel: r.hits > 1 ? `Used ${r.hits}× · شائع` : 'Learned · من الاستخدام',
    hits: r.hits,
  }));
}

/** Bootstrap signals from historical intake rows (safe to re-run). */
export async function bootstrapFromIntake(limit = 500) {
  await ensureLearningTables();
  const res = await query<{ company: string | null; city: string | null; meds: unknown }>(
    `SELECT company, city, meds FROM aid_requests
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );

  let n = 0;
  for (const row of res.rows) {
    if (row.company?.trim()) {
      await recordSignal({ key: 'company', value: row.company, weight: 0.5 });
      n++;
    }
    if (row.city?.trim()) {
      await recordSignal({ key: 'city', value: row.city, weight: 0.5 });
      n++;
    }
    const meds = Array.isArray(row.meds) ? row.meds : [];
    for (const m of meds) {
      const name =
        typeof m === 'object' && m && 'name' in m
          ? String((m as { name: string }).name)
          : String(m);
      if (name.trim()) {
        await recordSignal({ key: 'medicine', value: name, weight: 0.5 });
        n++;
      }
    }
  }
  return { signals_touched: n, rows: res.rows.length };
}
