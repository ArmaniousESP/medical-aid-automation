import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST { "secret": "..." } — sets httpOnly cookie for admin UI actions.
 * DELETE — clears cookie.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.PROCESS_SECRET;
  if (!expected) {
    return NextResponse.json({
      ok: true,
      message: 'No PROCESS_SECRET configured — UI is open',
    });
  }

  const body = await req.json().catch(() => ({}));
  const secret = String(body.secret || '');
  if (secret !== expected) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12, // 12h
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return res;
}

export async function GET() {
  const expected = process.env.PROCESS_SECRET;
  if (!expected) {
    return NextResponse.json({ unlocked: true, open: true });
  }
  const cookie = reqCookie();
  return NextResponse.json({
    unlocked: cookie === expected,
    open: false,
  });
}

function reqCookie(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { cookies } = require('next/headers');
    return cookies().get(ADMIN_COOKIE)?.value;
  } catch {
    return undefined;
  }
}
