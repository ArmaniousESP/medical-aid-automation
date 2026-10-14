import { NextRequest, NextResponse } from 'next/server';
import { lookupEmployeeProfile } from '@/lib/employeePortal';

export const dynamic = 'force-dynamic';

/**
 * POST { company, emp_id, phone }
 * Public — only returns data when all three match prior submissions.
 */
export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json(
        {
          ok: false,
          error:
            'No match. Check company, employee ID, and the phone used on a previous request.',
          code: 'not_found',
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
