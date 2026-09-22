import { NextRequest, NextResponse } from 'next/server';
import { getCombinationReport } from '@/lib/medCombinations';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set' },
        { status: 503 }
      );
    }
    const sp = req.nextUrl.searchParams;
    const report = await getCombinationReport({
      pairLimit: Number(sp.get('pairs') || 40),
      multiLimit: Number(sp.get('multi') || 50),
    });
    return NextResponse.json({ ok: true, ...report });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
