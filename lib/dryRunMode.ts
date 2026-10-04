import { cookies } from 'next/headers';

/** Ops session cookie — toggle WhatsApp dry-run without redeploy */
export const DRY_RUN_COOKIE = 'maa_wa_dry_run';

export function envForcesDryRun(): boolean {
  return process.env.WHATSAPP_DRY_RUN === '1';
}

/** Cookie value: '1' = dry-run on, '0' or missing = not forcing via cookie */
export function cookieDryRunOn(): boolean {
  try {
    const v = cookies().get(DRY_RUN_COOKIE)?.value;
    return v === '1';
  } catch {
    return false;
  }
}

/**
 * Effective dry-run for WhatsApp sends.
 * Priority: explicit true → env WHATSAPP_DRY_RUN → cookie toggle → explicit false
 */
export function isEffectiveDryRun(explicit?: boolean): boolean {
  if (explicit === true) return true;
  if (envForcesDryRun()) return true;
  if (cookieDryRunOn()) return true;
  return false;
}

export function dryRunModeStatus() {
  const env = envForcesDryRun();
  const cookie = cookieDryRunOn();
  return {
    env_forces: env,
    cookie_on: cookie,
    effective: env || cookie,
    /** UI may turn cookie off only when env does not force */
    can_toggle_off: !env,
  };
}
