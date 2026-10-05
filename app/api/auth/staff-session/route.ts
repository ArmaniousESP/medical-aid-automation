import { NextRequest, NextResponse } from 'next/server';
import { getNeonAuth, neonAuthConfigured } from '@/lib/auth/server';
import {
  STAFF_COOKIE,
  isEmailAllowed,
  signStaffToken,
  staffAccessStatus,
} from '@/lib/staffAccess';
import { sessionCookieOptions, clearCookieOptions } from '@/lib/cookies';

export const dynamic = 'force-dynamic';

/**
 * GET — current staff session status (public enough under /api/auth/)
 * POST — after Google sign-in, mint maa_ops_staff if email is allowlisted
 * DELETE — clear staff cookie
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    ok: true,
    neon_configured: neonAuthConfigured(),
    ...staffAccessStatus(req),
  });
}

export async function POST(req: NextRequest) {
  if (!neonAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Neon Auth not configured' },
      { status: 503 }
    );
  }

  const auth = getNeonAuth();
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: 'Neon Auth init failed' },
      { status: 503 }
    );
  }

  const { data: session, error } = await auth.getSession();
  if (error || !session?.user?.email) {
    return NextResponse.json(
      {
        ok: false,
        error: 'No Neon Auth session — sign in with Google first',
        detail: error?.message,
      },
      { status: 401 }
    );
  }

  const email = String(session.user.email);
  if (!isEmailAllowed(email)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Email ${email} is not on OPS_ALLOWED_EMAILS`,
        code: 'email_not_allowed',
      },
      { status: 403 }
    );
  }

  const token = signStaffToken(email);
  const res = NextResponse.json({
    ok: true,
    email,
    name: session.user.name || null,
    staff_cookie: STAFF_COOKIE,
  });
  res.cookies.set(STAFF_COOKIE, token, sessionCookieOptions(60 * 60 * 12));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, cleared: true });
  res.cookies.set(STAFF_COOKIE, '', clearCookieOptions());
  return res;
}
