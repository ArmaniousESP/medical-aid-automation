import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/** Signed cookie proving Google (Neon Auth) staff session was allowlisted */
export const STAFF_COOKIE = 'maa_ops_staff';

export function getAllowedStaffEmails(): string[] {
  const raw =
    process.env.OPS_ALLOWED_EMAILS ||
    process.env.STAFF_ALLOWED_EMAILS ||
    '';
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = getAllowedStaffEmails();
  // If allowlist empty but Neon Auth is on, deny all until configured
  if (!list.length) return false;
  return list.includes(email.trim().toLowerCase());
}

function signingKey(): string {
  return (
    process.env.NEON_AUTH_COOKIE_SECRET ||
    process.env.PROCESS_SECRET ||
    'dev-only-insecure-key-change-me'
  );
}

export function signStaffToken(email: string): string {
  const payload = Buffer.from(email.trim().toLowerCase(), 'utf8').toString(
    'base64url'
  );
  const sig = createHmac('sha256', signingKey())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyStaffToken(
  token: string | undefined | null
): { ok: boolean; email?: string } {
  if (!token || !token.includes('.')) return { ok: false };
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return { ok: false };
  const expected = createHmac('sha256', signingKey())
    .update(payload)
    .digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }
  try {
    const email = Buffer.from(payload, 'base64url').toString('utf8');
    if (!isEmailAllowed(email)) return { ok: false };
    return { ok: true, email };
  } catch {
    return { ok: false };
  }
}

export function readStaffCookie(req?: NextRequest): string | undefined {
  if (req) {
    const v = req.cookies.get(STAFF_COOKIE)?.value;
    if (v) return v;
  }
  try {
    return cookies().get(STAFF_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

export function isStaffCookieValid(req?: NextRequest): boolean {
  return verifyStaffToken(readStaffCookie(req)).ok;
}

export function staffAccessStatus(req?: NextRequest) {
  const token = readStaffCookie(req);
  const verified = verifyStaffToken(token);
  return {
    staff_cookie: STAFF_COOKIE,
    staff_cookie_present: !!token,
    staff_ok: verified.ok,
    staff_email: verified.email || null,
    allowlist_count: getAllowedStaffEmails().length,
    allowlist_configured: getAllowedStaffEmails().length > 0,
  };
}
