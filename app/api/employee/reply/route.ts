import { NextRequest, NextResponse } from 'next/server';
import {
  listRequestMessages,
  postEmployeeReply,
} from '@/lib/employeePortal';

export const dynamic = 'force-dynamic';

/** POST reply or GET messages for a verified employee */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await postEmployeeReply({
      request_id: String(body.request_id || ''),
      company: String(body.company || ''),
      emp_id: String(body.emp_id || ''),
      phone: String(body.phone || ''),
      body: String(body.body || ''),
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    const messages = await listRequestMessages(String(body.request_id));
    return NextResponse.json({ ok: true, messages });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const request_id = sp.get('request_id') || '';
    const company = sp.get('company') || '';
    const emp_id = sp.get('emp_id') || '';
    const phone = sp.get('phone') || '';
    if (!request_id || !company || !emp_id || !phone) {
      return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });
    }
    // Reuse reply verification by attempting a no-op path: lookup via postEmployeeReply gate
    const { lookupEmployeeProfile } = await import('@/lib/employeePortal');
    const profile = await lookupEmployeeProfile({ company, emp_id, phone });
    if (!profile || !profile.requests.some((r) => r.id === request_id)) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }
    const messages = await listRequestMessages(request_id);
    return NextResponse.json({ ok: true, messages });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
