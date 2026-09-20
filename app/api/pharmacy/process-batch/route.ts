import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth';
import { processPharmacyBatch } from '@/lib/pharmacy';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/pharmacy/process-batch
 * Body: { period?, cycleIds?, notes?, actor? }
 * Approves all pending then dispenses each cycle → ready for pharmacy fulfillment.
 */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not set' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = await processPharmacyBatch({
      period: body.period ? String(body.period) : undefined,
      cycleIds: Array.isArray(body.cycleIds) ? body.cycleIds.map(String) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      actor: body.actor ? String(body.actor) : undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Batch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
