/**
 * Flexible / resilient error handling for medical-aid pipelines.
 * Prefer partial success over hard failures when a step is optional.
 */

export type ErrorCode =
  | 'unauthorized'
  | 'missing_env'
  | 'google'
  | 'database'
  | 'validation'
  | 'timeout'
  | 'not_found'
  | 'conflict'
  | 'upstream'
  | 'unknown';

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;
  /** If true, callers may continue other steps */
  soft: boolean;

  constructor(
    message: string,
    opts: {
      code?: ErrorCode;
      status?: number;
      details?: unknown;
      soft?: boolean;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = opts.code || 'unknown';
    this.status = opts.status ?? statusForCode(opts.code || 'unknown');
    this.details = opts.details;
    this.soft = opts.soft ?? false;
    if (opts.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = opts.cause;
    }
  }
}

function statusForCode(code: ErrorCode): number {
  switch (code) {
    case 'unauthorized':
      return 401;
    case 'missing_env':
      return 503;
    case 'validation':
      return 400;
    case 'not_found':
      return 404;
    case 'conflict':
      return 409;
    case 'timeout':
      return 504;
    case 'google':
    case 'database':
    case 'upstream':
      return 502;
    default:
      return 500;
  }
}

export function classifyError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (/missing.*env|is not set|not configured/i.test(message)) {
    return new AppError(message, { code: 'missing_env', status: 503, soft: true });
  }
  if (/unauthorized|forbidden|401|403/i.test(message)) {
    return new AppError(message, { code: 'unauthorized', status: 401 });
  }
  if (/google|sheets|spreadsheet|private key|jwt/i.test(lower)) {
    return new AppError(message, { code: 'google', status: 502, soft: true });
  }
  if (/neon|postgres|database|econnrefused|enotfound|ssl/i.test(lower)) {
    return new AppError(message, { code: 'database', status: 502, soft: true });
  }
  if (/timeout|etimedout|aborted/i.test(lower)) {
    return new AppError(message, { code: 'timeout', status: 504, soft: true });
  }
  if (/not found|no rows/i.test(lower)) {
    return new AppError(message, { code: 'not_found', status: 404 });
  }

  return new AppError(message, { code: 'unknown', status: 500, cause: err });
}

export type StepResult<T> =
  | { ok: true; data: T; skipped?: false }
  | { ok: false; error: string; code: ErrorCode; soft: boolean; skipped?: boolean };

/** Run a step; never throw — return structured result. */
export async function softStep<T>(
  name: string,
  fn: () => Promise<T>,
  opts: { optional?: boolean } = {}
): Promise<StepResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    const app = classifyError(err);
    console.error(`[softStep:${name}]`, app.code, app.message);
    return {
      ok: false,
      error: app.message,
      code: app.code,
      soft: opts.optional ?? app.soft,
      skipped: opts.optional ?? false,
    };
  }
}

/** Retry with exponential backoff for transient failures. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    retries?: number;
    baseMs?: number;
    label?: string;
    shouldRetry?: (err: unknown) => boolean;
  } = {}
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseMs = opts.baseMs ?? 400;
  const shouldRetry =
    opts.shouldRetry ||
    ((err: unknown) => {
      const m = err instanceof Error ? err.message : String(err);
      return /timeout|econnreset|econnrefused|503|502|429|fetch failed|socket/i.test(
        m
      );
    });

  let last: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i === retries || !shouldRetry(err)) break;
      const wait = baseMs * Math.pow(2, i);
      console.warn(
        `[retry:${opts.label || 'op'}] attempt ${i + 1} failed, wait ${wait}ms`,
        err instanceof Error ? err.message : err
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

export function jsonError(err: unknown, fallbackStatus = 500) {
  const app = classifyError(err);
  return {
    body: {
      ok: false as const,
      error: app.message,
      code: app.code,
      soft: app.soft,
      details: app.details ?? undefined,
    },
    status: app.status || fallbackStatus,
  };
}

/** Aggregate multi-step pipeline outcome */
export function pipelineResult(steps: Record<string, StepResult<unknown>>) {
  const errors: Array<{ step: string; error: string; code: ErrorCode }> = [];
  const data: Record<string, unknown> = {};
  let hardFail = false;

  for (const [name, step] of Object.entries(steps)) {
    if (step.ok) {
      data[name] = step.data;
    } else {
      errors.push({ step: name, error: step.error, code: step.code });
      data[name] = null;
      if (!step.soft) hardFail = true;
    }
  }

  return {
    ok: !hardFail,
    partial: errors.length > 0 && !hardFail,
    data,
    errors,
  };
}
