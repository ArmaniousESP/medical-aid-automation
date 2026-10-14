import { NextRequest, NextResponse } from 'next/server';
import { upsertPriorRegimens } from '@/lib/priorRegimens';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Staff-only: POST { regimens: [...] } bulk import 2026 fulfilled support */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = body.regimens as {
      company: string;
      emp_name: string;
      emp_id?: string;
      phone?: string;
      patient_name: string;
      support_year?: number;
      meds: { name: string; qty: number; eva?: string; requested_name?: string }[];
      last_update?: string;
      notes?: string;
    }[];
    if (!Array.isArray(rows) || !rows.length) {
      return NextResponse.json(
        { ok: false, error: 'regimens array required' },
        { status: 400 }
      );
    }
    const result = await upsertPriorRegimens(rows);
    return NextResponse.json({ ok: true, ...result, total: rows.length });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
