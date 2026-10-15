/**
 * Simple in-memory rate limiter for serverless instances.
 * Best-effort (per-instance); enough to blunt casual abuse on public endpoints.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

export function rateLimit(
  key: string,
  opts?: { limit?: number; windowMs?: number }
): RateLimitResult {
  const limit = opts?.limit ?? 30;
  const windowMs = opts?.windowMs ?? 60_000;
  const now = Date.now();

  // Occasional cleanup
  if (buckets.size > 5_000) {
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }

  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return {
    ok: b.count <= limit,
    remaining: Math.max(0, limit - b.count),
    resetAt: b.resetAt,
    limit,
  };
}

export function clientKey(req: {
  headers: { get(name: string): string | null };
  ip?: string | null;
}): string {
  const xf =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    '';
  const ip = xf.split(',')[0]?.trim() || req.ip || 'unknown';
  return ip;
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(Math.ceil(r.resetAt / 1000)),
  };
}
