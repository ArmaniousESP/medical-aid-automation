import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not set', ok: false },
        { status: 503 }
      );
    }
    const period = req.nextUrl.searchParams.get('period') || undefined;
    const stats = await getDashboardStats(period || undefined);
    return NextResponse.json({ ok: true, ...stats });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}
