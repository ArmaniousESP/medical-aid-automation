import { NextRequest, NextResponse } from 'next/server';
import { buildRefillFromRows, type Relation } from '@/lib/tpa/chronic';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tpa/refill-preview
 * Build a chronic_refill.request payload from simple form/JSON input (for testing).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      programId,
      period,
      employeeId,
      patientName,
      relation = 'self',
      memberId,
      rows,
      roshettaUrl,
      webhookUrl,
    } = body || {};

    if (!programId || !period || !employeeId || !patientName || !Array.isArray(rows)) {
      return NextResponse.json(
        {
          error:
            'Required: programId, period, employeeId, patientName, rows[]',
        },
        { status: 400 }
      );
    }

    const payload = buildRefillFromRows({
      programId: String(programId),
      period: String(period),
      employeeId: String(employeeId),
      patientName: String(patientName),
      relation: relation as Relation,
      memberId: memberId ? String(memberId) : null,
      rows: rows.map((r: any, i: number) => ({
        lineId: String(r.lineId || `L${i + 1}`),
        drugName: String(r.drugName || r.drug_name || ''),
        qty: Number(r.qty) || 1,
        daysSupply: r.daysSupply != null ? Number(r.daysSupply) : 30,
        unitPrice: r.unitPrice != null ? Number(r.unitPrice) : null,
        companyPreferred: !!r.companyPreferred,
      })),
      roshettaUrl: roshettaUrl ? String(roshettaUrl) : undefined,
      webhookUrl: webhookUrl
        ? String(webhookUrl)
        : process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/tpa/webhook`
          : undefined,
    });

    return NextResponse.json({ ok: true, payload });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Preview failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
