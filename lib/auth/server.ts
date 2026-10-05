import { createNeonAuth } from '@neondatabase/auth/next/server';

export function neonAuthConfigured(): boolean {
  return !!(
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.NEON_AUTH_COOKIE_SECRET.length >= 32
  );
}

let _auth: ReturnType<typeof createNeonAuth> | null | undefined;

/** Lazy Neon Auth instance — null when env not set (build-safe). */
export function getNeonAuth() {
  if (_auth !== undefined) return _auth;
  if (!neonAuthConfigured()) {
    _auth = null;
    return null;
  }
  _auth = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    },
    logLevel: process.env.NEON_AUTH_LOG_LEVEL === 'debug' ? 'debug' : 'warn',
  });
  return _auth;
}

export type NeonSessionUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};
