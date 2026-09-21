import { NextRequest, NextResponse } from 'next/server';
import {
  listPspPrograms,
  pspSummary,
  savePnatAssessment,
  updateJourney,
} from '@/lib/psp';
import { evaluatePnat, scoresFromChecklist } from '@/lib/pnat';
import { authorizeRequest } from '@/lib/auth';
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
    if (sp.get('summary') === '1') {
      return NextResponse.json({ ok: true, ...(await pspSummary()) });
    }
    // Dry-run evaluate without save
    if (sp.get('preview') === '1') {
      const scores: Record<string, number> = {};
      for (const k of [
        'social_economic',
        'health_system',
        'condition',
        'therapy',
        'patient',
      ]) {
        const v = sp.get(k);
        if (v) scores[k] = Number(v);
      }
      return NextResponse.json({ ok: true, preview: evaluatePnat(scores) });
    }
    const rows = await listPspPrograms({
      stage: sp.get('stage') || undefined,
      q: sp.get('q') || undefined,
      limit: 200,
    });
    return NextResponse.json({ ok: true, count: rows.length, programs: rows });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'update_journey');

    if (action === 'pnat' || action === 'evaluate_pnat') {
      if (action === 'evaluate_pnat' || body.dry_run) {
        const scores = body.checklist
          ? scoresFromChecklist(body.checklist)
          : body.scores || {};
        return NextResponse.json({
          ok: true,
          preview: evaluatePnat(scores),
        });
      }
      if (!body.program_id) {
        return NextResponse.json(
          { ok: false, error: 'program_id required' },
          { status: 400 }
        );
      }
      const result = await savePnatAssessment({
        program_id: String(body.program_id),
        scores: body.scores,
        checklist: body.checklist,
        assessor: body.assessor ? String(body.assessor) : undefined,
        interventions: body.interventions
          ? String(body.interventions)
          : undefined,
        notes: body.notes ? String(body.notes) : undefined,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (!body.program_id) {
      return NextResponse.json(
        { ok: false, error: 'program_id required' },
        { status: 400 }
      );
    }

    await updateJourney({
      program_id: String(body.program_id),
      journey_stage: body.journey_stage
        ? String(body.journey_stage)
        : undefined,
      eligibility_tier: body.eligibility_tier
        ? String(body.eligibility_tier)
        : undefined,
      monthly_patient_share_egp:
        body.monthly_patient_share_egp != null
          ? Number(body.monthly_patient_share_egp)
          : undefined,
      disease_area:
        body.disease_area != null ? String(body.disease_area) : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
