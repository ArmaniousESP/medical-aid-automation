import { NextRequest, NextResponse } from 'next/server';
import { syncApprovedToPrograms } from '@/lib/syncApprovedToPrograms';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/programs/sync-from-sheet
 * Group Approved-Requests → create/update chronic_programs in Neon.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.PROCESS_SECRET;
    if (secret) {
      const h =
        req.headers.get('x-process-secret') ||
        req.nextUrl.searchParams.get('secret');
      if (h !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await syncApprovedToPrograms();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
