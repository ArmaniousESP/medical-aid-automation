import { NextRequest, NextResponse } from 'next/server';
import { upsertPriorRegimens } from '@/lib/priorRegimens';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorized(req: NextRequest): boolean {
  const secrets = (process.env.PROCESS_SECRET || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!secrets.length) return false;
  const got =
    req.headers.get('x-process-secret') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    '';
  return secrets.includes(got);
}

/** Staff-only bulk import of 2026 fulfilled regimens */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const rows = body.regimens;
    if (!Array.isArray(rows) || !rows.length) {
      return NextResponse.json(
        { ok: false, error: 'regimens array required' },
        { status: 400 }
      );
    }
    const result = await upsertPriorRegimens(rows);
    return NextResponse.json({ ok: true, ...result, total: rows.length });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
