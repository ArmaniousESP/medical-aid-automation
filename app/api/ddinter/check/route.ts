import { NextRequest, NextResponse } from 'next/server';
import { checkInteractions, checkProgramInteractions } from '@/lib/ddinter';
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
    const programId = sp.get('program_id');
    if (programId) {
      const result = await checkProgramInteractions(programId);
      return NextResponse.json({
        ok: true,
        ...result,
        disclaimer:
          'DDInter 2.0 (CC BY-NC-SA). Ops review only — not clinical CDS.',
      });
    }
    const drugs = (sp.get('drugs') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (drugs.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'Provide program_id or drugs=a,b,c' },
        { status: 400 }
      );
    }
    const result = await checkInteractions(drugs);
    return NextResponse.json({
      ok: true,
      ...result,
      disclaimer:
        'DDInter 2.0 (CC BY-NC-SA). Ops review only — not clinical CDS.',
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set' },
        { status: 503 }
      );
    }
    const body = await req.json().catch(() => ({}));
    if (body.program_id) {
      const result = await checkProgramInteractions(String(body.program_id));
      return NextResponse.json({ ok: true, ...result });
    }
    const drugs = Array.isArray(body.drugs)
      ? body.drugs.map(String)
      : String(body.drugs || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
    if (drugs.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'drugs array with 2+ names required' },
        { status: 400 }
      );
    }
    const result = await checkInteractions(drugs);
    return NextResponse.json({
      ok: true,
      ...result,
      disclaimer:
        'DDInter 2.0 (CC BY-NC-SA). Ops review only — not clinical CDS.',
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
