import { NextRequest, NextResponse } from 'next/server';
import { issueReleaseLetter } from '@/lib/releaseLetter';
import { query } from '@/lib/db';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Issue release letters for active programs due this period (no dispensed cycle) */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const d = new Date();
    const period =
      body.period ||
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const limit = Math.min(Number(body.limit) || 50, 150);
    const dryRun = body.dry_run === true;

    const res = await query<{ program_id: string; program_code: string }>(
      `SELECT cp.id AS program_id, cp.program_code
       FROM chronic_programs cp
       LEFT JOIN refill_cycles rc ON rc.program_id = cp.id AND rc.period = $1
       WHERE cp.status = 'active'
         AND (rc.id IS NULL OR rc.status NOT IN ('dispensed', 'cancelled'))
       ORDER BY cp.program_code
       LIMIT $2`,
      [period, limit]
    );

    const results: Array<{ program_id: string; letter_code?: string; error?: string }> =
      [];

    for (const row of res.rows) {
      if (dryRun) {
        results.push({ program_id: row.program_id, letter_code: `(dry) ${row.program_code}` });
        continue;
      }
      try {
        const letter = await issueReleaseLetter({
          program_id: row.program_id,
          period,
          pharmacy_note: body.pharmacy_note
            ? String(body.pharmacy_note)
            : undefined,
        });
        results.push({ program_id: row.program_id, letter_code: letter.letter_code });
      } catch (e: unknown) {
        results.push({
          program_id: row.program_id,
          error: e instanceof Error ? e.message : 'failed',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      period,
      dry_run: dryRun,
      attempted: results.length,
      issued: results.filter((r) => r.letter_code && !r.error).length,
      results,
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
