import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authorizeRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const STATUSES = ['draft', 'active', 'suspended', 'expired', 'cancelled'] as const;

/**
 * PATCH /api/programs/[id]
 * { status?: 'active'|'suspended'|..., notes?: string }
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id = ctx.params.id;

    if (body.status != null) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `status must be one of ${STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      await query(
        `UPDATE chronic_programs
         SET status = $1::program_status, updated_at = now()
         WHERE id = $2 OR program_code = $2`,
        [body.status, id]
      );
    }

    if (body.notes != null) {
      await query(
        `UPDATE chronic_programs SET notes = $1, updated_at = now()
         WHERE id = $2 OR program_code = $2`,
        [String(body.notes), id]
      );
    }

    const res = await query(
      `SELECT id, program_code, status, notes FROM chronic_programs
       WHERE id = $1 OR program_code = $1`,
      [id]
    );
    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await query(
      `INSERT INTO audit_log (entity_type, entity_id, action, actor, to_value)
       VALUES ('program', $1, 'patch', $2, $3::jsonb)`,
      [
        res.rows[0].id,
        body.actor || 'ui',
        JSON.stringify({ status: body.status, notes: body.notes }),
      ]
    );

    return NextResponse.json({ ok: true, program: res.rows[0] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
