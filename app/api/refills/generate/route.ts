import { NextRequest, NextResponse } from 'next/server';
import { generateRefills } from '@/lib/refills';
import { authorizeRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const period =
      body.period ||
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const result = await generateRefills(String(period));
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Generate failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
