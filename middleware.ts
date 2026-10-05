import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const ADMIN_COOKIE = 'maa_admin';
const STAFF_COOKIE = 'maa_ops_staff';

const PUBLIC_EXACT = new Set([
  '/',
  '/intake',
  '/request-status',
  '/guide',
  '/status',
  '/sign-in',
]);

const PUBLIC_PREFIXES = [
  '/api/health',
  '/api/auth/',
  '/api/request-status',
  '/api/webhooks/whatsapp',
  '/api/webhooks/twilio',
  '/_next/',
  '/favicon',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname === '/api/intake') return true;
  return false;
}

function getOpsSecrets(): string[] {
  return (process.env.PROCESS_SECRET || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getAllowedEmails(): string[] {
  return (process.env.OPS_ALLOWED_EMAILS || process.env.STAFF_ALLOWED_EMAILS || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function signingKey(): string {
  return (
    process.env.NEON_AUTH_COOKIE_SECRET ||
    process.env.PROCESS_SECRET ||
    'dev-only-insecure-key-change-me'
  );
}

function verifyStaffToken(token: string | undefined): boolean {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = createHmac('sha256', signingKey())
    .update(payload)
    .digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const email = Buffer.from(payload, 'base64url').toString('utf8');
    const list = getAllowedEmails();
    if (!list.length) return false;
    return list.includes(email.trim().toLowerCase());
  } catch {
    return false;
  }
}

function hasOpsAuth(req: NextRequest, secrets: string[]): boolean {
  if (verifyStaffToken(req.cookies.get(STAFF_COOKIE)?.value)) return true;

  const candidates = [
    req.headers.get('x-process-secret'),
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null,
    req.nextUrl.searchParams.get('secret'),
    req.cookies.get(ADMIN_COOKIE)?.value || null,
  ];
  return candidates.some((c) => c != null && secrets.includes(c));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const secrets = getOpsSecrets();
  const allowlist = getAllowedEmails();
  const neonReady = !!process.env.NEON_AUTH_BASE_URL && allowlist.length > 0;

  // No PROCESS_SECRET and no Google allowlist → lock ops
  if (!secrets.length && !neonReady) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Ops locked: set PROCESS_SECRET and/or Neon Auth + OPS_ALLOWED_EMAILS',
          code: 'secret_required',
        },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = neonReady ? '/sign-in' : '/';
    url.searchParams.set('need_secret', '1');
    return NextResponse.redirect(url);
  }

  if (hasOpsAuth(req, secrets)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized', code: 'unauthorized' },
      { status: 401 }
    );
  }

  const url = req.nextUrl.clone();
  if (neonReady) {
    url.pathname = '/sign-in';
    url.searchParams.set('next', pathname);
  } else {
    url.pathname = '/';
    url.searchParams.set('unlock', '1');
    url.searchParams.set('next', pathname);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
