import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authorizeRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * PATCH — toggle or set is_active on a chronic med line
 * { is_active: boolean }
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string; lineId: string } }
) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active boolean required' },
        { status: 400 }
      );
    }

    const prog = await query<{ id: string }>(
      `SELECT id FROM chronic_programs WHERE id = $1 OR program_code = $1`,
      [ctx.params.id]
    );
    if (!prog.rows[0]) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const updated = await query(
      `UPDATE chronic_med_lines
       SET is_active = $1, updated_at = now()
       WHERE id = $2 AND program_id = $3
       RETURNING id, line_code, requested_name, matched_name, is_active`,
      [body.is_active, ctx.params.lineId, prog.rows[0].id]
    );

    if (!updated.rows[0]) {
      return NextResponse.json({ error: 'Line not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, line: updated.rows[0] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
