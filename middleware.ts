import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_COOKIE = 'maa_admin';

const PUBLIC_EXACT = new Set([
  '/',
  '/intake',
  '/request-status',
  '/guide',
  '/status',
]);

const PUBLIC_PREFIXES = [
  '/api/health',
  '/api/auth/',
  '/api/request-status',
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

function hasOpsAuth(req: NextRequest, secrets: string[]): boolean {
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

  if (!secrets.length) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Ops locked: set PROCESS_SECRET on Vercel, then unlock from Home',
          code: 'secret_required',
        },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = '/';
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
  url.pathname = '/';
  url.searchParams.set('unlock', '1');
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
