import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const ADMIN_COOKIE = 'maa_admin';

/** True if PROCESS_SECRET is unset (open mode) or cookie matches. */
export function isAdminUnlocked(): boolean {
  const secret = process.env.PROCESS_SECRET;
  if (!secret) return true;
  try {
    const jar = cookies();
    return jar.get(ADMIN_COOKIE)?.value === secret;
  } catch {
    return false;
  }
}

/**
 * Allow if no secret, or x-process-secret / ?secret= / admin cookie match.
 */
export function authorizeRequest(req: NextRequest): boolean {
  const secret = process.env.PROCESS_SECRET;
  if (!secret) return true;

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
