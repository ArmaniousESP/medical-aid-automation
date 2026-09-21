import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** Backfill first_dispense_at from earliest dispensed cycle */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `UPDATE chronic_programs cp
       SET first_dispense_at = sub.first_disp,
           updated_at = now()
       FROM (
         SELECT program_id, min(dispensed_at) AS first_disp
         FROM refill_cycles
         WHERE status = 'dispensed' AND dispensed_at IS NOT NULL
         GROUP BY program_id
       ) sub
       WHERE cp.id = sub.program_id
         AND (cp.first_dispense_at IS NULL OR cp.first_dispense_at > sub.first_disp)
       RETURNING cp.id`
    );

    const stats = await query<{ with_first: string; active: string }>(
      `SELECT
         count(*) FILTER (WHERE first_dispense_at IS NOT NULL)::text AS with_first,
         count(*)::text AS active
       FROM chronic_programs WHERE status = 'active'`
    );

    return NextResponse.json({
      ok: true,
      updated: result.rowCount ?? result.rows.length,
      active_with_first_dispense: Number(stats.rows[0]?.with_first || 0),
      active_programs: Number(stats.rows[0]?.active || 0),
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
