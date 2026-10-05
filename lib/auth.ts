import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { isStaffCookieValid, staffAccessStatus } from '@/lib/staffAccess';

export const ADMIN_COOKIE = 'maa_admin';

/**
 * Valid ops secrets from PROCESS_SECRET.
 * Supports a single value or comma-separated list for multiple staff passwords:
 *   PROCESS_SECRET=alice-secret,bob-secret
 */
export function getOpsSecrets(): string[] {
  const raw = process.env.PROCESS_SECRET || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isValidOpsSecret(value: string | undefined | null): boolean {
  if (!value) return false;
  return getOpsSecrets().includes(value);
}

export function isAdminUnlocked(): boolean {
  if (isStaffCookieValid()) return true;
  const secrets = getOpsSecrets();
  if (!secrets.length) return false;
  try {
    const jar = cookies();
    const v = jar.get(ADMIN_COOKIE)?.value;
    return isValidOpsSecret(v);
  } catch {
    return false;
  }
}

/**
 * Ops access if:
 * - PROCESS_SECRET cookie / header matches, OR
 * - signed staff cookie from Neon Auth Google (allowlisted email)
 */
export function authorizeRequest(req: NextRequest): boolean {
  if (isStaffCookieValid(req)) return true;

  const secrets = getOpsSecrets();
  if (!secrets.length) return false;

  const candidates = [
    req.headers.get('x-process-secret'),
    req.nextUrl.searchParams.get('secret'),
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null,
    req.cookies.get(ADMIN_COOKIE)?.value || null,
  ];

  return candidates.some((c) => isValidOpsSecret(c));
}

export function unauthorizedResponse() {
  const secretConfigured = getOpsSecrets().length > 0;
  const staff = staffAccessStatus();
  const neonHint =
    process.env.NEON_AUTH_BASE_URL && staff.allowlist_configured
      ? ' or sign in with Google on /sign-in'
      : process.env.NEON_AUTH_BASE_URL
        ? ' — set OPS_ALLOWED_EMAILS for Google staff'
        : '';

  return {
    body: {
      ok: false as const,
      error: secretConfigured
        ? `Unauthorized — unlock on Home with PROCESS_SECRET${neonHint}`
        : staff.allowlist_configured
          ? 'Unauthorized — sign in with Google on /sign-in'
          : 'Ops locked — set PROCESS_SECRET and/or Neon Auth + OPS_ALLOWED_EMAILS',
      code: secretConfigured || staff.allowlist_configured
        ? 'unauthorized'
        : 'secret_required',
    },
    status: 401,
  };
}
