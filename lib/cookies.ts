import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

/** Prefer Secure on HTTPS (Vercel production / preview). */
export function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === '0') return false;
  if (process.env.COOKIE_SECURE === '1') return true;
  if (process.env.VERCEL === '1') return true;
  return process.env.NODE_ENV === 'production';
}

export function sessionCookieOptions(
  maxAgeSeconds: number
): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function clearCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: 0,
  };
}
