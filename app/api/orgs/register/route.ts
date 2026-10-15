import { NextRequest, NextResponse } from 'next/server';
import { registerOrganization } from '@/lib/organizations';

export const dynamic = 'force-dynamic';

/** POST — public organization registration */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await registerOrganization({
      org_name: String(body.org_name || body.name || ''),
      org_code: body.org_code ? String(body.org_code) : undefined,
      contact_name: String(body.contact_name || ''),
      contact_email: String(body.contact_email || body.email || ''),
      contact_phone: body.contact_phone
        ? String(body.contact_phone)
        : undefined,
      country: body.country ? String(body.country) : 'EG',
      employee_count_est: body.employee_count_est
        ? Number(body.employee_count_est)
        : undefined,
      message: body.message ? String(body.message) : undefined,
      auto_activate: body.auto_activate !== false,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result, {
      status: result.status === 'pending' ? 202 : 201,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
