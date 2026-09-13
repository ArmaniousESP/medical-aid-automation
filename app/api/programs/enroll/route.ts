import { NextRequest, NextResponse } from 'next/server';
import { enrollChronicProgram } from '@/lib/programs';
import { authorizeRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = await enrollChronicProgram({
      externalEmployeeId: String(body.externalEmployeeId || body.employeeId || ''),
      employeeName: String(body.employeeName || ''),
      patientName: String(body.patientName || ''),
      relation: body.relation ? String(body.relation) : 'self',
      startDate: body.startDate ? String(body.startDate) : undefined,
      endDate: body.endDate != null ? String(body.endDate) : null,
      sequence: body.sequence != null ? Number(body.sequence) : 1,
      roshettaUrl: body.roshettaUrl ? String(body.roshettaUrl) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      meds: Array.isArray(body.meds)
        ? body.meds.map((m: any) => ({
            lineCode: m.lineCode,
            requestedName: String(m.requestedName || m.drugName || ''),
            matchedName: m.matchedName ? String(m.matchedName) : undefined,
            qtyPerCycle: m.qtyPerCycle != null ? Number(m.qtyPerCycle) : 1,
            daysSupply: m.daysSupply != null ? Number(m.daysSupply) : 30,
            formularyFlag: m.formularyFlag,
            companyPreferred: !!m.companyPreferred,
            doseText: m.doseText,
          }))
        : [],
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Enroll failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
