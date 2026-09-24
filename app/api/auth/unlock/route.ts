import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, getOpsSecrets, isValidOpsSecret } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST { secret } — sets httpOnly admin cookie if secret matches PROCESS_SECRET
 * (or one of a comma-separated list).
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

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
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
  const secrets = getOpsSecrets();
  if (!secrets.length) {
    return NextResponse.json({
      unlocked: false,
      open: false,
      secret_configured: false,
      message: 'Set PROCESS_SECRET on Vercel to enable ops unlock',
    });
  }
  const cookie = reqCookie();
  return NextResponse.json({
    unlocked: isValidOpsSecret(cookie),
    open: false,
    secret_configured: true,
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
