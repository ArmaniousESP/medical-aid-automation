import { query } from '@/lib/db';
import { ensureOrgTables } from '@/lib/organizations';
import { resolveOrgCodeForCompany } from '@/lib/orgScope';

/**
 * Backfill aid_requests.org_code from company / existing DEFAULT rows.
 */
export async function backfillAidRequestOrgCodes(limit = 500): Promise<{
  scanned: number;
  updated: number;
  samples: { id: string; company: string | null; org_code: string }[];
}> {
  await ensureOrgTables();
  const res = await query<{ id: string; company: string | null; org_code: string | null }>(
    `SELECT id::text, company, org_code
     FROM aid_requests
     WHERE company IS NOT NULL AND trim(company) <> ''
       AND (
         org_code IS NULL
         OR upper(org_code) = 'DEFAULT'
       )
     ORDER BY created_at DESC
     LIMIT $1`,
    [Math.min(limit, 2000)]
  );

  let updated = 0;
  const samples: { id: string; company: string | null; org_code: string }[] = [];

  for (const row of res.rows) {
    const code = await resolveOrgCodeForCompany(row.company);
    if (!code || upperEq(code, row.org_code)) continue;
    await query(
      `UPDATE aid_requests SET org_code = $2, updated_at = now() WHERE id = $1::uuid`,
      [row.id, code]
    );
    updated += 1;
    if (samples.length < 15) {
      samples.push({ id: row.id, company: row.company, org_code: code });
    }
  }

  return { scanned: res.rows.length, updated, samples };
}

function upperEq(a: string, b: string | null | undefined) {
  return (a || '').toUpperCase() === (b || '').toUpperCase();
}
