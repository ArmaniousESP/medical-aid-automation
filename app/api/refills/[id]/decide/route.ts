import { NextRequest, NextResponse } from 'next/server';
import { decideItem, approveAllPending } from '@/lib/refills';
import { authorizeRequest } from '@/lib/auth';
import { assertRefillSafetyAck, getRefillSafetyReport } from '@/lib/refillSafety';

export const dynamic = 'force-dynamic';

/**
 * POST /api/refills/[id]/decide
 * Single: { itemId, decision, acknowledge_safety? }
 * Bulk:   { approveAll: true, acknowledge_safety? }
 */
export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const acknowledge_safety = body.acknowledge_safety === true;
    const actor = body.reviewed_by ? String(body.reviewed_by) : 'api';

    const isApprove =
      body.approveAll === true || body.decision === 'approved';

    if (isApprove) {
      try {
        await assertRefillSafetyAck(ctx.params.id, acknowledge_safety, actor);
      } catch (e: unknown) {
        const safety = await getRefillSafetyReport(ctx.params.id);
        return NextResponse.json(
          {
            error: e instanceof Error ? e.message : 'Safety gate',
            code: 'safety_ack_required',
            safety,
          },
          { status: 409 }
        );
      }
    }

    if (body.approveAll === true) {
      const detail = await approveAllPending(
        ctx.params.id,
        body.reviewed_by ? String(body.reviewed_by) : undefined
      );
      return NextResponse.json({ ok: true, ...detail });
    }

    const {
      itemId,
      decision,
      approved_qty,
      approved_amount_egp,
      rejection_reason,
      reviewed_by,
    } = body || {};

    if (!itemId || !['approved', 'rejected', 'skipped'].includes(decision)) {
      return NextResponse.json(
        {
          error:
            'itemId + decision required, or { approveAll: true }',
        },
        { status: 400 }
      );
    }

    const detail = await decideItem({
      cycleId: ctx.params.id,
      itemId: String(itemId),
      decision,
      approved_qty: approved_qty != null ? Number(approved_qty) : undefined,
      approved_amount_egp:
        approved_amount_egp != null ? Number(approved_amount_egp) : undefined,
      rejection_reason: rejection_reason ? String(rejection_reason) : undefined,
      reviewed_by: reviewed_by ? String(reviewed_by) : undefined,
    });

    return NextResponse.json({ ok: true, ...detail });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Decide failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
