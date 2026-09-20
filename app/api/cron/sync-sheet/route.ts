import { NextRequest, NextResponse } from 'next/server';
import { syncApprovedToPrograms } from '@/lib/syncApprovedToPrograms';
import { softStep, jsonError, AppError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          ok: false,
          error: 'DATABASE_URL not set',
          code: 'missing_env',
          soft: true,
        },
        { status: 503 }
      );
    }

    const hasGoogle =
      !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      !!process.env.GOOGLE_PRIVATE_KEY &&
      !!process.env.GOOGLE_SHEET_ID;

    if (!hasGoogle) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID required',
          code: 'missing_env',
          soft: true,
        },
        { status: 503 }
      );
    }

    const started = Date.now();
    const step = await softStep('sync', () => syncApprovedToPrograms());
    if (!step.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: step.error,
          code: step.code,
          soft: step.soft,
          duration_ms: Date.now() - started,
        },
        { status: step.soft ? 503 : 500 }
      );
    }

    // Per-group errors from sync are soft — overall still ok
    const data = step.data as {
      groups: number;
      created: number;
      updated: number;
      skipped: number;
      errors: string[];
    };

    return NextResponse.json({
      ok: true,
      partial: (data.errors?.length || 0) > 0,
      duration_ms: Date.now() - started,
      ...data,
      group_errors: data.errors || [],
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.PROCESS_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  if (req.headers.get('x-process-secret') === secret) return true;
  if (req.nextUrl.searchParams.get('secret') === secret) return true;
  return false;
}
