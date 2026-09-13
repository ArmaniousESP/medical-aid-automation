import { NextRequest, NextResponse } from 'next/server';
import { processNewResponses } from '@/lib/processor';
import { authorizeRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);
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
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true';
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
