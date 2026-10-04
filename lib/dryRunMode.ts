import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

/** Ops session cookie — toggle WhatsApp dry-run without redeploy */
export const DRY_RUN_COOKIE = 'maa_wa_dry_run';

export function envForcesDryRun(): boolean {
  return process.env.WHATSAPP_DRY_RUN === '1';
}

function readDryRunCookieValue(req?: NextRequest): string | undefined {
  if (req) {
    const fromReq = req.cookies.get(DRY_RUN_COOKIE)?.value;
    if (fromReq != null) return fromReq;
  }
  try {
    return cookies().get(DRY_RUN_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

/** Cookie value: '1' = dry-run on */
export function cookieDryRunOn(req?: NextRequest): boolean {
  return readDryRunCookieValue(req) === '1';
}

/**
 * Effective dry-run for WhatsApp sends.
 * Priority: explicit true → env WHATSAPP_DRY_RUN → cookie toggle
 */
export function isEffectiveDryRun(
  explicit?: boolean,
  req?: NextRequest
): boolean {
  if (explicit === true) return true;
  if (envForcesDryRun()) return true;
  if (cookieDryRunOn(req)) return true;
  return false;
}

export function dryRunModeStatus(req?: NextRequest) {
  const env = envForcesDryRun();
  const cookie = cookieDryRunOn(req);
  return {
    env_forces: env,
    cookie_on: cookie,
    cookie_name: DRY_RUN_COOKIE,
    cookie_present: readDryRunCookieValue(req) != null,
    effective: env || cookie,
    can_toggle_off: !env,
  };
}
