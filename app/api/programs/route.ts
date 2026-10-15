import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authorizeRequest, unauthorizedResponse } from '@/lib/auth';
import { resolveOrgScope } from '@/lib/orgScope';

export const dynamic = 'force-dynamic';

/** GET /api/programs?status=active */
export async function GET(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      const u = unauthorizedResponse();
      return NextResponse.json(u.body, { status: u.status });
    }
    const status = new URL(req.url).searchParams.get('status') || 'active';
    const scope = await resolveOrgScope(req);
    const params: unknown[] = [status];
    let orgFilter = '';
    if (!scope.all) {
      if (!scope.org_ids.length) {
        return NextResponse.json({
          ok: true,
          count: 0,
          programs: [],
          org_scope: { all: false, org_codes: [], source: scope.source },
        });
      }
      params.push(scope.org_ids);
      orgFilter = `AND e.org_id = ANY($${params.length}::uuid[])`;
    }
    const res = await query(
      `SELECT
         cp.id,
         cp.program_code,
         cp.status,
         cp.start_date,
         cp.end_date,
         e.external_employee_id,
         e.full_name AS employee_name,
         d.full_name AS patient_name,
         d.relation,
         (SELECT count(*)::int FROM chronic_med_lines m
          WHERE m.program_id = cp.id AND m.is_active) AS med_count
       FROM chronic_programs cp
       JOIN employees e ON e.id = cp.employee_id
       JOIN dependents d ON d.id = cp.dependent_id
       WHERE cp.status = $1::program_status
       ${orgFilter}
       ORDER BY cp.program_code`,
      params
    );
    return NextResponse.json({
      ok: true,
      count: res.rows.length,
      programs: res.rows,
      org_scope: {
        all: scope.all,
        org_codes: scope.org_codes,
        source: scope.source,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'List failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
