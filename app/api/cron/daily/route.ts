import { NextRequest, NextResponse } from 'next/server';
import { processNewResponses } from '@/lib/processor';
import { syncApprovedToPrograms } from '@/lib/syncApprovedToPrograms';
import { softStep, pipelineResult, jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron + manual: process form then sync chronic programs.
 * Soft-fails individual steps so one missing env does not kill the other.
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
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', code: 'unauthorized' },
        { status: 401 }
      );
    }

    const processStep = await softStep(
      'process',
      () => processNewResponses(false),
      { optional: false }
    );

    // Sync is optional if DB missing — soft
    const syncStep = process.env.DATABASE_URL
      ? await softStep('sync', () => syncApprovedToPrograms(), {
          optional: true,
        })
      : {
          ok: false as const,
          error: 'DATABASE_URL not set',
          code: 'missing_env' as const,
          soft: true,
          skipped: true,
        };

    const pipe = pipelineResult({
      process: processStep,
      sync: syncStep,
    });

    return NextResponse.json(
      {
        ok: pipe.ok,
        partial: pipe.partial,
        process: processStep.ok ? processStep.data : null,
        sync: syncStep.ok ? syncStep.data : null,
        errors: pipe.errors,
      },
      { status: pipe.ok ? 200 : 500 }
    );
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

function authorize(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || process.env.PROCESS_SECRET;
  if (!cronSecret) return true;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${cronSecret}`) return true;
  const h = req.headers.get('x-process-secret');
  if (h === cronSecret) return true;
  const q = req.nextUrl.searchParams.get('secret');
  if (q && q === cronSecret) return true;
  return false;
}
