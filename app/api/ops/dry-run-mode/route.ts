import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import {
  DRY_RUN_COOKIE,
  dryRunModeStatus,
  envForcesDryRun,
} from '@/lib/dryRunMode';

export const dynamic = 'force-dynamic';

/** GET current dry-run mode (ops only) */
export async function GET(req: NextRequest) {
  if (!authorizeRequest(req)) {
    const u = unauthorizedResponse();
    return NextResponse.json(u.body, { status: u.status });
  }
  return NextResponse.json({ ok: true, ...dryRunModeStatus() });
}

/**
 * POST { enabled: boolean }
 * Sets maa_wa_dry_run cookie. Env WHATSAPP_DRY_RUN=1 always wins for sends.
 */
export async function POST(req: NextRequest) {
  if (!authorizeRequest(req)) {
    const u = unauthorizedResponse();
    return NextResponse.json(u.body, { status: u.status });
  }

  const body = await req.json().catch(() => ({}));
  const enabled = body.enabled === true || body.enabled === '1' || body.enabled === 1;

  if (!enabled && envForcesDryRun()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'WHATSAPP_DRY_RUN=1 is set on Vercel — remove it and redeploy to allow live sends',
        ...dryRunModeStatus(),
      },
      { status: 409 }
    );
  }

  const res = NextResponse.json({
    ok: true,
    enabled,
    env_forces: envForcesDryRun(),
    cookie_on: enabled,
    effective: enabled || envForcesDryRun(),
    can_toggle_off: !envForcesDryRun(),
  });

  res.cookies.set(DRY_RUN_COOKIE, enabled ? '1' : '0', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
