import { NextRequest, NextResponse } from 'next/server';
import {
  createAidRequest,
  listAidRequests,
  updateAidRequestStatus,
  type IntakeMedLine,
} from '@/lib/intake';
import { mshSearchMedicines, mshEstimateCost } from '@/lib/msh';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/intake — ops list only (auth required)
 * POST — public submit | search_med | estimate
 * POST set_status — ops only
 */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set' },
        { status: 503 }
      );
    }
    if (!authorizeRequest(req)) {
      const u = unauthorizedResponse();
      return NextResponse.json(u.body, { status: u.status });
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
      const result = await mshSearchMedicines(
        String(body.q || ''),
        Number(body.limit) || 8
      );
      return NextResponse.json(result);
    }

    if (action === 'estimate') {
      const lines = Array.isArray(body.lines) ? body.lines : [];
      const result = await mshEstimateCost(lines);
      return NextResponse.json(result);
    }

    if (action === 'set_status') {
      if (!authorizeRequest(req)) {
        const u = unauthorizedResponse();
        return NextResponse.json(u.body, { status: u.status });
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
      patient_name:
        body.patient_name || body.patient
          ? String(body.patient_name || body.patient)
          : undefined,
      city: body.city ? String(body.city) : undefined,
      meds,
      comments: body.comments ? String(body.comments) : undefined,
      roshetta_urls:
        body.roshetta_urls || (body.roshetta ? [String(body.roshetta)] : []),
      invoice_urls: body.invoice_urls || [],
      lab_urls: body.lab_urls || [],
      card_urls: body.card_urls || [],
      source: body.source ? String(body.source) : 'platform',
      msh_request_id: body.msh_request_id
        ? String(body.msh_request_id)
        : undefined,
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
      status_url: `/request-status?id=${created.id}`,
      message:
        'Request received. Save your Request ID to check status later.',
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
