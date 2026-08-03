import { NextRequest, NextResponse } from 'next/server';
import { processNewResponses } from '@/lib/processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);

    // Optional simple auth via header or query secret
    const secret = process.env.PROCESS_SECRET;
    if (secret) {
      const provided =
        req.headers.get('x-process-secret') ||
        req.nextUrl.searchParams.get('secret');
      if (provided !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await processNewResponses(dryRun);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Processing failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Allow simple GET for cron / Vercel cron jobs
  const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true';
  const secret = process.env.PROCESS_SECRET;

  if (secret) {
    const provided = req.nextUrl.searchParams.get('secret');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await processNewResponses(dryRun);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Processing failed' },
      { status: 500 }
    );
  }
}
