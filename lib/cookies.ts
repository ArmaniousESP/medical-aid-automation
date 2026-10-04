/** Prefer Secure on HTTPS (Vercel production / preview). */
export function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === '0') return false;
  if (process.env.COOKIE_SECURE === '1') return true;
  if (process.env.VERCEL === '1') return true;
  return process.env.NODE_ENV === 'production';
}

export type SessionCookieOpts = {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
};

export function sessionCookieOptions(maxAgeSeconds: number): SessionCookieOpts {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function clearCookieOptions(): SessionCookieOpts {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: 0,
  };
}
