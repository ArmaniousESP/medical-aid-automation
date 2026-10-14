import { NextRequest, NextResponse } from 'next/server';
import { upsertEmployeeRoster } from '@/lib/employeeRoster';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Staff-only bulk import.
 * POST { rows: [{ company, emp_name, emp_id, phone }], source? }
 * or POST { seed: true } to load bundled data/employee_roster_seed.json
 */
export async function POST(req: NextRequest) {
  try {
    // Middleware already gates non-public APIs behind ops auth.
    const body = await req.json();
    let rows = body.rows as
      | { company: string; emp_name: string; emp_id?: string; phone?: string }[]
      | undefined;

    if (body.seed === true || body.use_seed === true) {
      const seed = await import('@/data/employee_roster_seed.json');
      rows = (seed.default || seed) as typeof rows;
    }

    if (!Array.isArray(rows) || !rows.length) {
      return NextResponse.json(
        { ok: false, error: 'rows array required (or seed: true)' },
        { status: 400 }
      );
    }

    const result = await upsertEmployeeRoster(
      rows,
      String(body.source || 'api_import')
    );
    return NextResponse.json({ ok: true, ...result, total: rows.length });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { rosterCount, listRosterCompanies } = await import(
      '@/lib/employeeRoster'
    );
    const n = await rosterCount();
    const companies = await listRosterCompanies();
    return NextResponse.json({ ok: true, count: n, companies });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
