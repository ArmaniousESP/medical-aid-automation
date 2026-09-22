import { NextRequest, NextResponse } from 'next/server';
import { scanProgramsForDdi } from '@/lib/ddinterScan';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: false, error: 'DATABASE_URL not set' }, { status: 503 });
    }
    const sp = req.nextUrl.searchParams;
    const report = await scanProgramsForDdi({
      limit: Number(sp.get('limit') || 25),
      minMeds: Number(sp.get('min_meds') || 2),
    });
    return NextResponse.json({
      ok: true,
      ...report,
      disclaimer: 'DDInter 2.0 · ops triage only · not clinical CDS',
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
