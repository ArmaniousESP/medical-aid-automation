import { NextRequest, NextResponse } from 'next/server';
import { getNeonAuth, neonAuthConfigured } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

/**
 * Neon Auth / Managed Better Auth proxy.
 * Note: app/api/auth/unlock remains a specific route and takes precedence.
 */
async function handle(req: NextRequest) {
  if (!neonAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Neon Auth not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET (32+ chars) on Vercel.',
        code: 'neon_auth_missing',
      },
      { status: 503 }
    );
  }
  const auth = getNeonAuth();
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: 'Neon Auth init failed' },
      { status: 503 }
    );
  }
  const handlers = auth.handler();
  const method = req.method.toUpperCase();
  if (method === 'GET') return handlers.GET(req);
  if (method === 'POST') return handlers.POST(req);
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
