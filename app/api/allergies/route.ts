import { NextRequest, NextResponse } from 'next/server';
import {
  addAllergy,
  deactivateAllergy,
  listAllergiesForDependent,
  checkMedsAgainstAllergies,
  checkProgramAllergies,
} from '@/lib/allergyCrossReact';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const programId = sp.get('program_id');
    if (programId) {
      const result = await checkProgramAllergies(programId);
      return NextResponse.json({
        ok: true,
        ...result,
        disclaimer:
          'Ops triage rules only — not a substitute for allergy consultation.',
      });
    }
    const dependentId = sp.get('dependent_id');
    if (!dependentId) {
      return NextResponse.json(
        { ok: false, error: 'program_id or dependent_id required' },
        { status: 400 }
      );
    }
    const allergies = await listAllergiesForDependent(dependentId);
    return NextResponse.json({ ok: true, allergies });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));

    if (body.action === 'deactivate' && body.id) {
      await deactivateAllergy(String(body.id));
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'check') {
      const allergies = Array.isArray(body.allergies)
        ? body.allergies
        : [{ allergen_label: String(body.allergen || '') }];
      const meds = Array.isArray(body.meds)
        ? body.meds.map(String)
        : String(body.meds || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
      const result = await checkMedsAgainstAllergies(allergies, meds);
      return NextResponse.json({
        ok: true,
        ...result,
        disclaimer: 'Ops triage only — not clinical CDS.',
      });
    }

    if (!body.dependent_id || !body.allergen_label) {
      return NextResponse.json(
        { ok: false, error: 'dependent_id and allergen_label required' },
        { status: 400 }
      );
    }

    const row = await addAllergy({
      dependentId: String(body.dependent_id),
      allergenLabel: String(body.allergen_label),
      severity: body.severity ? String(body.severity) : 'unknown',
      reactionNote: body.reaction_note ? String(body.reaction_note) : undefined,
    });
    return NextResponse.json({ ok: true, allergy: row });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
