import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, getOpsSecrets, isValidOpsSecret } from '@/lib/auth';
import { clearCookieOptions, sessionCookieOptions } from '@/lib/cookies';

export const dynamic = 'force-dynamic';

/**
 * POST { secret } — sets httpOnly admin cookie if secret matches PROCESS_SECRET
 * DELETE — clears cookie
 * GET — unlocked state
 */
export async function POST(req: NextRequest) {
  const secrets = getOpsSecrets();
  if (!secrets.length) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'PROCESS_SECRET is not set on the server. Add it in Vercel → Environment Variables, redeploy, then unlock.',
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const secret = String(body.secret || '');
  if (!isValidOpsSecret(secret)) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, cookie: ADMIN_COOKIE });
  res.cookies.set(
    ADMIN_COOKIE,
    secret,
    sessionCookieOptions(60 * 60 * 12)
  );
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', clearCookieOptions());
  return res;
}

export async function GET(req: NextRequest) {
  const secrets = getOpsSecrets();
  if (!secrets.length) {
    return NextResponse.json({
      unlocked: false,
      open: false,
      secret_configured: false,
      message: 'Set PROCESS_SECRET on Vercel to enable ops unlock',
    });
  }

  let cookieVal: string | undefined =
    req.cookies.get(ADMIN_COOKIE)?.value ?? undefined;
  if (cookieVal == null) {
    try {
      cookieVal = cookies().get(ADMIN_COOKIE)?.value;
    } catch {
      cookieVal = undefined;
    }
  }

  return NextResponse.json({
    unlocked: isValidOpsSecret(cookieVal),
    open: false,
    secret_configured: true,
    cookie_name: ADMIN_COOKIE,
    cookie_present: cookieVal != null && cookieVal !== '',
  });
}
