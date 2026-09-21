import { NextRequest, NextResponse } from 'next/server';
import { evaluatePfet, savePfetAssessment } from '@/lib/pfet';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (sp.get('preview') === '1') {
    const result = evaluatePfet({
      household_size: Number(sp.get('hh') || 1),
      monthly_income_egp: Number(sp.get('income') || 0),
      monthly_med_cost_egp: Number(sp.get('med') || 0),
      other_burden_egp: Number(sp.get('other') || 0),
    });
    return NextResponse.json({ ok: true, preview: result });
  }
  return NextResponse.json({
    ok: true,
    note: 'POST to save; GET ?preview=1&income=&med=&hh=&other=',
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    if (!body.program_id) {
      return NextResponse.json({ ok: false, error: 'program_id required' }, { status: 400 });
    }
    if (body.dry_run || body.preview) {
      return NextResponse.json({
        ok: true,
        preview: evaluatePfet(body),
      });
    }
    const result = await savePfetAssessment({
      program_id: String(body.program_id),
      household_size: body.household_size != null ? Number(body.household_size) : undefined,
      monthly_income_egp:
        body.monthly_income_egp != null ? Number(body.monthly_income_egp) : undefined,
      monthly_med_cost_egp:
        body.monthly_med_cost_egp != null ? Number(body.monthly_med_cost_egp) : undefined,
      other_burden_egp:
        body.other_burden_egp != null ? Number(body.other_burden_egp) : undefined,
      assessor: body.assessor ? String(body.assessor) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
