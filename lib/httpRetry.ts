/**
 * Shared fetch retry with exponential backoff + jitter.
 * Retries on network errors and selected HTTP statuses (408, 429, 5xx).
 */

export type RetryOptions = {
  /** Total attempts including the first (default 3) */
  maxAttempts?: number;
  /** Initial delay in ms (default 400) */
  baseDelayMs?: number;
  /** Cap delay in ms (default 8000) */
  maxDelayMs?: number;
  /** Extra statuses to retry (default includes 408, 429, 500-599) */
  retryStatuses?: number[];
  /** Abort signal for the whole sequence */
  signal?: AbortSignal;
};

export type RetryOutcome<T> = {
  result: T;
  attempts: number;
  errors: string[];
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new Error('aborted'));
      },
      { once: true }
    );
  });
}

function defaultRetryable(status: number, extra?: number[]): boolean {
  if (status === 408 || status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  if (extra?.includes(status)) return true;
  return false;
}

function backoffMs(attempt: number, base: number, max: number): number {
  // attempt 0 → base, then 2^n with jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(250, exp * 0.2));
  return Math.min(max, exp + jitter);
}

/**
 * Retry an async operation that returns a value + whether to retry.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<{ value: T; retry: boolean; error?: string }>,
  opts?: RetryOptions
): Promise<RetryOutcome<T>> {
  const maxAttempts = Math.max(1, opts?.maxAttempts ?? 3);
  const base = opts?.baseDelayMs ?? 400;
  const maxDelay = opts?.maxDelayMs ?? 8000;
  const errors: string[] = [];
  let last!: T;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { value, retry, error } = await fn(attempt);
      last = value;
      if (!retry) {
        return { result: value, attempts: attempt + 1, errors };
      }
      if (error) errors.push(error);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
      if (attempt === maxAttempts - 1) {
        throw e;
      }
    }

    if (attempt < maxAttempts - 1) {
      await sleep(backoffMs(attempt, base, maxDelay), opts?.signal);
    }
  }

  return { result: last, attempts: maxAttempts, errors };
}

/**
 * fetch() with retries. Returns the final Response (even if not ok after retries).
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts?: RetryOptions
): Promise<{ response: Response; attempts: number; errors: string[] }> {
  const maxAttempts = Math.max(1, opts?.maxAttempts ?? 3);
  const base = opts?.baseDelayMs ?? 400;
  const maxDelay = opts?.maxDelayMs ?? 8000;
  const errors: string[] = [];
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: opts?.signal ?? init?.signal,
      });
      lastResponse = response;

      if (
        response.ok ||
        !defaultRetryable(response.status, opts?.retryStatuses) ||
        attempt === maxAttempts - 1
      ) {
        return { response, attempts: attempt + 1, errors };
      }

      errors.push(`HTTP ${response.status}`);
      // drain body so connection can reuse
      await response.text().catch(() => '');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
      if (attempt === maxAttempts - 1) {
        throw e;
      }
    }

    if (attempt < maxAttempts - 1) {
      await sleep(backoffMs(attempt, base, maxDelay), opts?.signal);
    }
  }

  if (!lastResponse) {
    throw new Error(errors.join('; ') || 'fetch failed');
  }
  return { response: lastResponse, attempts: maxAttempts, errors };
}

/** Env-tunable defaults for WhatsApp / outbound webhooks */
export function webhookRetryDefaults(): RetryOptions {
  const maxAttempts = Number(process.env.WEBHOOK_RETRY_ATTEMPTS || 3);
  const baseDelayMs = Number(process.env.WEBHOOK_RETRY_BASE_MS || 400);
  const maxDelayMs = Number(process.env.WEBHOOK_RETRY_MAX_MS || 8000);
  return {
    maxAttempts: Number.isFinite(maxAttempts) ? Math.min(8, Math.max(1, maxAttempts)) : 3,
    baseDelayMs: Number.isFinite(baseDelayMs) ? baseDelayMs : 400,
    maxDelayMs: Number.isFinite(maxDelayMs) ? maxDelayMs : 8000,
  };
}
