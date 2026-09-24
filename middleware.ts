import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_COOKIE = 'maa_admin';

/** Paths anyone may open without ops secret */
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
  // Public intake API: POST submit + search/estimate handled in route;
  // GET list is blocked in the route handler. Allow path through middleware.
  if (pathname === '/api/intake') return true;
  return false;
}

function hasOpsAuth(req: NextRequest, secret: string): boolean {
  if (req.headers.get('x-process-secret') === secret) return true;
  if (req.headers.get('authorization') === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get('secret') === secret) return true;
  if (req.cookies.get(ADMIN_COOKIE)?.value === secret) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.PROCESS_SECRET;

  // No secret configured → block all ops (force configuring a secret)
  if (!secret) {
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

  if (hasOpsAuth(req, secret)) {
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
    /*
     * Match all paths except static assets
     */
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
