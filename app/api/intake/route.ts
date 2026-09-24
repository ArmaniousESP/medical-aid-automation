import { NextRequest, NextResponse } from 'next/server';
import {
  createAidRequest,
  listAidRequests,
  updateAidRequestStatus,
  type IntakeMedLine,
} from '@/lib/intake';
import { mshSearchMedicines, mshEstimateCost } from '@/lib/msh';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/intake — list requests (ops; auth if PROCESS_SECRET set)
 * POST /api/intake — public beneficiary submit
 * POST action=search_med | estimate | set_status
 */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set' },
        { status: 503 }
      );
    }
    // List is ops-facing
    if (process.env.PROCESS_SECRET && !authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const sp = req.nextUrl.searchParams;
    const rows = await listAidRequests({
      status: sp.get('status') || 'all',
      q: sp.get('q') || undefined,
      limit: Number(sp.get('limit') || 50),
    });
    return NextResponse.json({ ok: true, count: rows.length, requests: rows });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set — cannot store intake' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'submit');

    if (action === 'search_med') {
      const result = await mshSearchMedicines(String(body.q || ''), Number(body.limit) || 8);
      return NextResponse.json(result);
    }

    if (action === 'estimate') {
      const lines = Array.isArray(body.lines) ? body.lines : [];
      const result = await mshEstimateCost(lines);
      return NextResponse.json(result);
    }

    if (action === 'set_status') {
      if (!authorizeRequest(req)) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
      }
      if (!body.id || !body.status) {
        return NextResponse.json(
          { ok: false, error: 'id and status required' },
          { status: 400 }
        );
      }
      await updateAidRequestStatus(String(body.id), body.status, {
        match_notes: body.match_notes,
        program_id: body.program_id,
      });
      return NextResponse.json({ ok: true, id: body.id, status: body.status });
    }

    // submit (public)
    const meds: IntakeMedLine[] = Array.isArray(body.meds)
      ? body.meds
      : String(body.medicine_summary || '')
          .split(/[\n,;]+/)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((name: string) => ({ name, qty: 1 }));

    const created = await createAidRequest({
      emp_name: String(body.emp_name || body.employee_name || ''),
      emp_id: body.emp_id ? String(body.emp_id) : undefined,
      company: body.company ? String(body.company) : undefined,
      phone: body.phone ? String(body.phone) : undefined,
      patient_name: body.patient_name || body.patient ? String(body.patient_name || body.patient) : undefined,
      city: body.city ? String(body.city) : undefined,
      meds,
      comments: body.comments ? String(body.comments) : undefined,
      roshetta_urls: body.roshetta_urls || (body.roshetta ? [String(body.roshetta)] : []),
      invoice_urls: body.invoice_urls || [],
      lab_urls: body.lab_urls || [],
      card_urls: body.card_urls || [],
      source: body.source ? String(body.source) : 'platform',
      msh_request_id: body.msh_request_id ? String(body.msh_request_id) : undefined,
      estimated_monthly_cost:
        body.estimated_monthly_cost != null
          ? Number(body.estimated_monthly_cost)
          : null,
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      status: created.status,
      created_at: created.created_at,
      message:
        'Request received. Ops will triage on the platform — Google Form is not required.',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'intake failed';
    if (/required|medicine/i.test(msg)) {
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
