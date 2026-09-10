import { NextRequest, NextResponse } from 'next/server';
import { decideItem } from '@/lib/refills';

export const dynamic = 'force-dynamic';

/**
 * POST /api/refills/[id]/decide
 * { itemId, decision: approved|rejected|skipped, approved_qty?, approved_amount_egp?, rejection_reason?, reviewed_by? }
 */
export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { itemId, decision, approved_qty, approved_amount_egp, rejection_reason, reviewed_by } =
      body || {};

    if (!itemId || !['approved', 'rejected', 'skipped'].includes(decision)) {
      return NextResponse.json(
        { error: 'itemId and decision (approved|rejected|skipped) required' },
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
