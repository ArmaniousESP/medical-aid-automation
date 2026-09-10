/**
 * Chronic medication program + refill payloads for TPA / eTPA integration
 * (e.g. SehaTech, Yodawy, GlobeMed).
 */

export type CoverageType = 'self_funded' | 'insured' | 'both';
export type Relation = 'self' | 'spouse' | 'child' | 'parent' | 'other';
export type ProgramStatus = 'active' | 'suspended' | 'expired' | 'cancelled';
export type RefillItemStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'partial'
  | 'dispensed';
export type RefillStatus =
  | 'submitted'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'needs_info'
  | 'dispensed'
  | 'cancelled';

export interface ChronicDocument {
  type: 'prescription' | 'id_card' | 'lab' | 'other';
  url: string;
  issued_at?: string | null;
}

export interface FormularyInfo {
  company_preferred: boolean;
  flag?: 'EVA_PREFERRED' | 'NOT_IN_EVA' | 'UNKNOWN';
  alternative_of?: string | null;
}

export interface ChronicMedicationLine {
  line_id: string;
  requested_name: string;
  matched_name?: string;
  scientific_name?: string | null;
  form?: string;
  strength?: string;
  dose_text?: string;
  qty_per_cycle: number;
  days_supply: number;
  refill_frequency?: 'monthly' | 'weekly';
  max_refills?: number;
  formulary?: FormularyInfo;
}

export interface ChronicProgramUpsert {
  event_type: 'chronic_program.upsert';
  idempotency_key: string;
  source_system: 'medical-aid-automation';
  employer: { code: string; name?: string };
  member: {
    external_employee_id: string;
    member_id?: string | null;
    full_name: string;
    phone?: string | null;
    coverage_type: CoverageType;
  };
  patient: {
    full_name: string;
    relation: Relation;
    date_of_birth?: string | null;
  };
  program: {
    program_id: string;
    status: ProgramStatus;
    start_date: string;
    end_date?: string | null;
    renewal_mode: 'monthly_refill';
    documents: ChronicDocument[];
  };
  medications: ChronicMedicationLine[];
  metadata?: Record<string, unknown>;
}

export interface ChronicRefillRequest {
  event_type: 'chronic_refill.request';
  idempotency_key: string;
  source_system: 'medical-aid-automation';
  program_id: string;
  refill: {
    period: string;
    requested_at: string;
    delivery?: {
      mode?: 'pickup' | 'delivery' | 'pickup_or_delivery';
      address_text?: string | null;
      city?: string;
      phone?: string;
    };
  };
  member: {
    external_employee_id: string;
    member_id?: string | null;
  };
  patient: {
    full_name: string;
    relation: Relation;
  };
  items: Array<{
    line_id: string;
    drug_name: string;
    qty: number;
    days_supply: number;
    unit_price_egp?: number | null;
    line_total_egp?: number | null;
    company_preferred?: boolean;
  }>;
  totals?: {
    currency: 'EGP';
    estimated_total?: number;
    company_cap_remaining?: number | null;
  };
  documents?: ChronicDocument[];
  callback?: {
    webhook_url: string;
    headers?: Record<string, string>;
  };
}

export interface ChronicRefillStatusEvent {
  event_type: 'chronic_refill.status' | 'chronic_refill.dispensed';
  program_id: string;
  refill_period: string;
  external_claim_id?: string;
  tpa_auth_id?: string;
  status: RefillStatus;
  processed_at?: string;
  items: Array<{
    line_id: string;
    drug_name: string;
    status: RefillItemStatus;
    approved_qty?: number;
    approved_amount_egp?: number;
    rejection_reason?: string | null;
    dispensed_qty?: number;
  }>;
  dispense?: {
    status?: 'pending_pharmacy' | 'dispensed' | 'failed';
    provider_id?: string | null;
    provider_name?: string | null;
    dispensed_at?: string | null;
  };
  totals?: {
    approved_total_egp?: number;
    patient_share_egp?: number;
    employer_share_egp?: number;
  };
}

export function buildRefillFromRows(input: {
  programId: string;
  period: string;
  employeeId: string;
  patientName: string;
  relation: Relation;
  memberId?: string | null;
  rows: Array<{
    lineId: string;
    drugName: string;
    qty: number;
    daysSupply?: number;
    unitPrice?: number | null;
    companyPreferred?: boolean;
  }>;
  roshettaUrl?: string;
  webhookUrl?: string;
}): ChronicRefillRequest {
  const items = input.rows.map((r) => ({
    line_id: r.lineId,
    drug_name: r.drugName,
    qty: r.qty,
    days_supply: r.daysSupply ?? 30,
    unit_price_egp: r.unitPrice ?? null,
    line_total_egp:
      r.unitPrice != null ? Math.round(r.unitPrice * r.qty * 100) / 100 : null,
    company_preferred: !!r.companyPreferred,
  }));

  const estimated = items.reduce((s, i) => s + (i.line_total_egp || 0), 0);

  return {
    event_type: 'chronic_refill.request',
    idempotency_key: `refill-${input.programId}-${input.period}`,
    source_system: 'medical-aid-automation',
    program_id: input.programId,
    refill: {
      period: input.period,
      requested_at: new Date().toISOString(),
    },
    member: {
      external_employee_id: input.employeeId,
      member_id: input.memberId ?? null,
    },
    patient: {
      full_name: input.patientName,
      relation: input.relation,
    },
    items,
    totals: { currency: 'EGP', estimated_total: estimated },
    documents: input.roshettaUrl
      ? [{ type: 'prescription', url: input.roshettaUrl }]
      : [],
    callback: input.webhookUrl
      ? { webhook_url: input.webhookUrl }
      : undefined,
  };
}

export function buildProgramId(
  employeeId: string,
  sequence = 1,
  year = new Date().getFullYear()
): string {
  return `CHR-${year}-${employeeId}-${String(sequence).padStart(2, '0')}`;
}
