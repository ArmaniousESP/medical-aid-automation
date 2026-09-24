import { NextRequest, NextResponse } from 'next/server';
import {
  createClaimDraft,
  listClaims,
  getClaim,
  updateClaimStatus,
  submitClaimExternal,
  type ClaimStatus,
} from '@/lib/claims';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import { jsonError, AppError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      const u = unauthorizedResponse();
      return NextResponse.json(u.body, { status: u.status });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set', code: 'missing_env' },
        { status: 503 }
      );
    }

    const sp = req.nextUrl.searchParams;
    const id = sp.get('id');
    if (id) {
      const full = await getClaim(id);
      return NextResponse.json({ ok: true, ...full });
    }

    const rows = await listClaims({
      status: sp.get('status') || 'all',
      q: sp.get('q') || undefined,
      limit: Number(sp.get('limit') || 50),
    });
    return NextResponse.json({ ok: true, count: rows.length, claims: rows });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      const u = unauthorizedResponse();
      return NextResponse.json(u.body, { status: u.status });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set', code: 'missing_env' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'create');

    if (action === 'create') {
      if (!Array.isArray(body.lines) || !body.lines.length) {
        throw new AppError('lines array required', {
          code: 'validation',
          status: 400,
          details: { field: 'lines' },
        });
      }
      const created = await createClaimDraft({
        aid_request_id: body.aid_request_id,
        program_id: body.program_id,
        emp_name: body.emp_name,
        emp_id: body.emp_id,
        patient_name: body.patient_name,
        period: body.period,
        notes: body.notes,
        lines: body.lines,
      });
      return NextResponse.json({ ok: true, ...created });
    }

    if (action === 'set_status') {
      if (!body.id || !body.status) {
        throw new AppError('id and status required', {
          code: 'validation',
          status: 400,
        });
      }
      await updateClaimStatus(String(body.id), body.status as ClaimStatus, {
        notes: body.notes,
        total_approved_egp:
          body.total_approved_egp != null
            ? Number(body.total_approved_egp)
            : undefined,
        external_ref: body.external_ref,
      });
      return NextResponse.json({ ok: true, id: body.id, status: body.status });
    }

    if (action === 'submit') {
      if (!body.id) {
        throw new AppError('id required', { code: 'validation', status: 400 });
      }
      const result = await submitClaimExternal(String(body.id));
      return NextResponse.json({
        ok: result.ok,
        ...result,
        id: body.id,
      });
    }

    throw new AppError(`Unknown action: ${action}`, {
      code: 'validation',
      status: 400,
      details: { allowed: ['create', 'set_status', 'submit'] },
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
