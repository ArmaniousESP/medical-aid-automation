import { NextRequest, NextResponse } from 'next/server';
import { importAllDdinterFiles, ddinterStats } from '@/lib/ddinter';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Import DDInter 2.0 CSV files (by ATC code) into Neon.
 * POST { "codes": ["A","B"] } optional — default all.
 * Auth required. License: CC BY-NC-SA 4.0 — non-commercial use.
 */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const codes = Array.isArray(body.codes)
      ? body.codes.map(String)
      : undefined;

    const started = Date.now();
    const result = await importAllDdinterFiles({ codes });
    const stats = await ddinterStats();

    return NextResponse.json({
      ok: true,
      duration_ms: Date.now() - started,
      ...result,
      stats,
      license: 'CC BY-NC-SA 4.0 — https://ddinter2.scbdd.com',
      note: 'Ops triage only. Not licensed clinical decision support.',
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: false, pairs: 0 }, { status: 503 });
    }
    const stats = await ddinterStats();
    return NextResponse.json({
      ok: true,
      ...stats,
      source: 'https://ddinter2.scbdd.com',
      license: 'CC BY-NC-SA 4.0',
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
