import { NextRequest, NextResponse } from 'next/server';
import { resolveExternalUnitPrice, searchDwaPrices, searchEgyptianDrugDb } from '@/lib/externalPrices';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/price?q=Concor+10
 * Quick lookup against external price sources (for testing / ops).
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json(
        { error: 'Query param "q" is required (min 2 chars)' },
        { status: 400 }
      );
    }

    const [best, dwa, edd] = await Promise.all([
      resolveExternalUnitPrice(q),
      searchDwaPrices(q, 5),
      searchEgyptianDrugDb(q, 5),
    ]);

    return NextResponse.json({
      query: q,
      best,
      dwaprices: dwa,
      egyptianDrugDb: edd,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Price lookup failed' },
      { status: 500 }
    );
  }
}
