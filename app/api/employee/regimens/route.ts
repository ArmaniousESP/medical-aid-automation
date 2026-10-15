import { NextRequest, NextResponse } from 'next/server';
import {
  getPriorRegimenById,
  listPriorRegimensForEmployee,
  RENEWAL_DEADLINE,
  RENEWAL_YEAR,
  renewalDeadlinePassed,
} from '@/lib/priorRegimens';

export const dynamic = 'force-dynamic';

/**
 * GET ?id=<uuid> — single prior regimen for intake prefill (public, no PHI beyond known regimen).
 * POST { company, emp_id, phone } — list regimens for employee portal.
 */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'id required' },
        { status: 400 }
      );
    }
    const regimen = await getPriorRegimenById(id);
    if (!regimen) {
      return NextResponse.json(
        { ok: false, error: 'not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      ok: true,
      renewal_year: RENEWAL_YEAR,
      deadline: RENEWAL_DEADLINE,
      regimen,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}

/** POST { company, emp_id, phone } — prior fulfilled regimens for renewal */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const company = String(body.company || '').trim();
    const emp_id = String(body.emp_id || '').trim();
    const phone = String(body.phone || '').trim();
    if (!company || !emp_id || !phone) {
      return NextResponse.json(
        { ok: false, error: 'company, emp_id, phone required' },
        { status: 400 }
      );
    }
    const regimens = await listPriorRegimensForEmployee({
      company,
      emp_id,
      phone,
    });
    return NextResponse.json({
      ok: true,
      renewal_year: RENEWAL_YEAR,
      deadline: RENEWAL_DEADLINE,
      deadline_passed: renewalDeadlinePassed(),
      count: regimens.length,
      regimens,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
