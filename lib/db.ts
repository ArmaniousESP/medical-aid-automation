import { Pool, type QueryResultRow } from 'pg';

/**
 * Neon / PostgreSQL pool for serverless.
 * Set DATABASE_URL in Vercel (use Neon pooler endpoint).
 */
const globalForPg = globalThis as unknown as { pgPool?: Pool };

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return globalForPg.pgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  const pool = getPool();
  return pool.query<T>(text, params);
}

export async function getDefaultOrgId(): Promise<string> {
  const res = await query<{ id: string }>(
    `SELECT id FROM organizations WHERE code = 'DEFAULT' LIMIT 1`
  );
  if (!res.rows[0]) {
    throw new Error('DEFAULT organization not found — run schema migration');
  }
  return res.rows[0].id;
}
