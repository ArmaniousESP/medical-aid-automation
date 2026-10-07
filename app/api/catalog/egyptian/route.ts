import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import {
  egyptianDrugCount,
  syncEgyptianCatalog,
} from '@/lib/egyptianCatalogDb';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET — rows stored in Neon */
export async function GET(req: NextRequest) {
  if (!authorizeRequest(req)) {
    const u = unauthorizedResponse();
    return NextResponse.json(u.body, { status: u.status });
  }
  const stored = await egyptianDrugCount();
  return NextResponse.json({
    ok: true,
    stored,
    table: 'egyptian_drugs',
    source: 'karem505/egyptian-drug-database',
  });
}

/**
 * POST — load the Egyptian CSV into Neon.
 * Body: { offset?: number, batch?: number }
 * Repeat while next_offset is set (~25k rows, a few calls).
 */
export async function POST(req: NextRequest) {
  if (!authorizeRequest(req)) {
    const u = unauthorizedResponse();
    return NextResponse.json(u.body, { status: u.status });
  }
  const body = await req.json().catch(() => ({}));
  try {
    const result = await syncEgyptianCatalog({
      offset: body.offset != null ? Number(body.offset) : 0,
      batch: body.batch != null ? Number(body.batch) : 800,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'sync failed' },
      { status: 500 }
    );
  }
}
