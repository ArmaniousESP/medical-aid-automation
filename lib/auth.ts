import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

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

/**
 * Ops access requires at least one PROCESS_SECRET.
 * Cookie / header / Bearer / ?secret= must match one of the configured secrets.
 * If PROCESS_SECRET is unset, ops are locked.
 */
export function isAdminUnlocked(): boolean {
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

export function authorizeRequest(req: NextRequest): boolean {
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
  const configured = getOpsSecrets().length > 0;
  return {
    body: {
      ok: false as const,
      error: configured
        ? 'Unauthorized — unlock on Home with PROCESS_SECRET'
        : 'Ops locked — set PROCESS_SECRET on Vercel',
      code: configured ? 'unauthorized' : 'secret_required',
    },
    status: 401,
  };
}
