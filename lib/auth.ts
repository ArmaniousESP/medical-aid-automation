import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const ADMIN_COOKIE = 'maa_admin';

/**
 * Ops access requires PROCESS_SECRET.
 * - Cookie maa_admin, header x-process-secret, Bearer, or ?secret=
 * - If PROCESS_SECRET is unset, ops are locked (not open).
 */
export function isAdminUnlocked(): boolean {
  const secret = process.env.PROCESS_SECRET;
  if (!secret) return false;
  try {
    const jar = cookies();
    return jar.get(ADMIN_COOKIE)?.value === secret;
  } catch {
    return false;
  }
}

export function authorizeRequest(req: NextRequest): boolean {
  const secret = process.env.PROCESS_SECRET;
  if (!secret) return false;

  const header = req.headers.get('x-process-secret');
  if (header === secret) return true;

  const q = req.nextUrl.searchParams.get('secret');
  if (q === secret) return true;

  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie === secret) return true;

  return false;
}

/** Require auth or return a 401 JSON body helper */
export function unauthorizedResponse() {
  return {
    body: {
      ok: false as const,
      error: process.env.PROCESS_SECRET
        ? 'Unauthorized — unlock on Home with PROCESS_SECRET'
        : 'Ops locked — set PROCESS_SECRET on Vercel',
      code: process.env.PROCESS_SECRET ? 'unauthorized' : 'secret_required',
    },
    status: 401,
  };
}
