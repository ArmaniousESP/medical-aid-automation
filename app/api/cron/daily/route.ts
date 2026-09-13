import { NextRequest, NextResponse } from 'next/server';
import { processNewResponses } from '@/lib/processor';
import { syncApprovedToPrograms } from '@/lib/syncApprovedToPrograms';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron + manual: process form then sync chronic programs.
 * Auth: Authorization: Bearer <CRON_SECRET> or x-process-secret
 */
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  try {
    if (!authorize(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const processResult = await processNewResponses(false);
    let sync: unknown = null;
    if (process.env.DATABASE_URL) {
      sync = await syncApprovedToPrograms();
    }

    return NextResponse.json({
      ok: true,
      process: processResult,
      sync,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function authorize(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || process.env.PROCESS_SECRET;
  if (!cronSecret) return true; // open only if no secret configured
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${cronSecret}`) return true;
  const h = req.headers.get('x-process-secret');
  if (h === cronSecret) return true;
  // Vercel Cron sends this header when CRON_SECRET is set in project
  const vercel = req.headers.get('x-vercel-cron');
  if (vercel === '1' && process.env.VERCEL === '1') {
    // Prefer CRON_SECRET when available; allow Vercel-invoked if PROCESS_SECRET matches query
    const q = req.nextUrl.searchParams.get('secret');
    if (q && q === cronSecret) return true;
  }
  return false;
}
