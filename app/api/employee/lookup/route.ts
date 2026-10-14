import { NextRequest, NextResponse } from 'next/server';
import { lookupEmployeeProfile } from '@/lib/employeePortal';
import { ensureRosterSeeded, rosterCount } from '@/lib/employeeRoster';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST { company, emp_id, phone }
 * Public — only returns data when company + emp_id + phone match
 * HR roster or a prior submission.
 */
export async function POST(req: NextRequest) {
  try {
    // Ensure HR list is present on this database (first hit may seed)
    await ensureRosterSeeded();

    const body = await req.json();
    const company = String(body.company || '').trim();
    const emp_id = String(body.emp_id || '').trim();
    const phone = String(body.phone || '').trim();

    if (!company || !emp_id || !phone) {
      return NextResponse.json(
        { ok: false, error: 'company, emp_id, and phone are required' },
        { status: 400 }
      );
    }

    const profile = await lookupEmployeeProfile({ company, emp_id, phone });
    if (!profile) {
      const n = await rosterCount().catch(() => 0);
      return NextResponse.json(
        {
          ok: false,
          error:
            n === 0
              ? 'Employee list is still loading. Wait a moment and try again, or submit a first request.'
              : 'No match. Check company, employee ID, and phone (must match HR records or a previous request).',
          code: 'not_found',
          roster_size: n,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, profile });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
