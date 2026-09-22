import { NextRequest, NextResponse } from 'next/server';
import { scanRefillSafetyQueue } from '@/lib/refillSafety';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: false, error: 'DATABASE_URL not set' }, { status: 503 });
    }
    const limit = Number(req.nextUrl.searchParams.get('limit') || 40);
    const report = await scanRefillSafetyQueue({ limit });
    return NextResponse.json({
      ok: true,
      ...report,
      disclaimer: 'Ops triage only — not clinical CDS',
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
