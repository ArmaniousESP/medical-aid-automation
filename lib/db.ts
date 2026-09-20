import { Pool, type QueryResultRow } from 'pg';
import { withRetry, AppError } from '@/lib/errors';

/**
 * Neon / PostgreSQL pool for serverless.
 * Set DATABASE_URL in Vercel (use Neon pooler endpoint).
 */
const globalForPg = globalThis as unknown as { pgPool?: Pool };

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new AppError('DATABASE_URL is not set', {
      code: 'missing_env',
      status: 503,
      soft: true,
    });
  }
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForPg.pgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return withRetry(
    async () => {
      const pool = getPool();
      return pool.query<T>(text, params);
    },
    { retries: 2, baseMs: 300, label: 'db.query' }
  );
}

export async function getDefaultOrgId(): Promise<string> {
  const res = await query<{ id: string }>(
    `SELECT id FROM organizations WHERE code = 'DEFAULT' LIMIT 1`
  );
  if (!res.rows[0]) {
    throw new AppError('DEFAULT organization not found — run schema migration', {
      code: 'database',
      status: 503,
    });
  }
  return res.rows[0].id;
}
