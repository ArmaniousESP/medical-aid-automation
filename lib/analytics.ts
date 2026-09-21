import { query } from '@/lib/db';

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export type AnalyticsBundle = {
  period: string;
  kpis: {
    active_programs: number;
    active_med_lines: number;
    unique_patients: number;
    unique_employees: number;
    eva_lines: number;
    not_eva_lines: number;
    eva_pct: number;
    programs_with_docs: number;
    refill_cycles_period: number;
    dispensed_period: number;
    in_review_period: number;
    est_cost_period_egp: number;
    approved_cost_period_egp: number;
  };
  top_drugs: Array<{
    drug_name: string;
    line_count: number;
    program_count: number;
    total_qty: number;
    eva_count: number;
  }>;
  formulary_mix: Array<{ flag: string; n: number }>;
  top_employees_by_meds: Array<{
    employee_id: string;
    employee_name: string;
    program_count: number;
    med_count: number;
  }>;
  monthly_refills: Array<{
    period: string;
    cycles: number;
    dispensed: number;
    est_egp: number;
    approved_egp: number;
  }>;
  relation_mix: Array<{ relation: string; n: number }>;
};

export async function getMedicalAnalytics(
  period = currentPeriod()
): Promise<AnalyticsBundle> {
  const [
    kpisRes,
    topDrugs,
    formulary,
    topEmp,
    monthly,
    relations,
  ] = await Promise.all([
    query<{ 
      active_programs: string;
      active_med_lines: string;
      unique_patients: string;
      unique_employees: string;
      eva_lines: string;
      not_eva_lines: string;
      programs_with_docs: string;
      refill_cycles: string;
      dispensed: string;
      in_review: string;
      est: string;
      appr: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM chronic_programs WHERE status = 'active') AS active_programs,
         (SELECT count(*)::text FROM chronic_med_lines WHERE is_active) AS active_med_lines,
         (SELECT count(DISTINCT dependent_id)::text FROM chronic_programs WHERE status = 'active') AS unique_patients,
         (SELECT count(DISTINCT employee_id)::text FROM chronic_programs WHERE status = 'active') AS unique_employees,
         (SELECT count(*)::text FROM chronic_med_lines
           WHERE is_active AND (company_preferred OR (formulary_flag ILIKE '%EVA%' AND formulary_flag NOT ILIKE '%NOT%'))) AS eva_lines,
         (SELECT count(*)::text FROM chronic_med_lines
           WHERE is_active AND NOT (company_preferred OR (formulary_flag ILIKE '%EVA%' AND formulary_flag NOT ILIKE '%NOT%'))) AS not_eva_lines,
         (SELECT count(DISTINCT entity_id)::text FROM attachments WHERE entity_type = 'program') AS programs_with_docs,
         (SELECT count(*)::text FROM refill_cycles WHERE period = $1) AS refill_cycles,
         (SELECT count(*)::text FROM refill_cycles WHERE period = $1 AND status = 'dispensed') AS dispensed,
         (SELECT count(*)::text FROM refill_cycles WHERE period = $1 AND status IN ('in_review','submitted','draft')) AS in_review,
         (SELECT coalesce(sum(estimated_total_egp),0)::text FROM refill_cycles WHERE period = $1) AS est,
         (SELECT coalesce(sum(approved_total_egp),0)::text FROM refill_cycles WHERE period = $1) AS appr`,
      [period]
    ),
    query<{ drug_name: string; line_count: string; program_count: string; total_qty: string; eva_count: string }>(
      `SELECT
         coalesce(nullif(trim(matched_name), ''), requested_name) AS drug_name,
         count(*)::text AS line_count,
         count(DISTINCT program_id)::text AS program_count,
         sum(qty_per_cycle)::text AS total_qty,
         count(*) FILTER (
           WHERE company_preferred OR (formulary_flag ILIKE '%EVA%' AND formulary_flag NOT ILIKE '%NOT%')
         )::text AS eva_count
       FROM chronic_med_lines
       WHERE is_active
       GROUP BY 1
       ORDER BY count(*) DESC
       LIMIT 25`
    ),
    query<{ flag: string; n: string }>(
      `SELECT
         CASE
           WHEN company_preferred OR (formulary_flag ILIKE '%EVA%' AND formulary_flag NOT ILIKE '%NOT%')
             THEN 'Available in EVA'
           ELSE 'NOT IN EVA'
         END AS flag,
         count(*)::text AS n
       FROM chronic_med_lines
       WHERE is_active
       GROUP BY 1
       ORDER BY count(*) DESC`
    ),
    query<{ employee_id: string; employee_name: string; program_count: string; med_count: string }>(
      `SELECT
         e.external_employee_id AS employee_id,
         e.full_name AS employee_name,
         count(DISTINCT cp.id)::text AS program_count,
         count(ml.id)::text AS med_count
       FROM chronic_programs cp
       JOIN employees e ON e.id = cp.employee_id
       JOIN chronic_med_lines ml ON ml.program_id = cp.id AND ml.is_active
       WHERE cp.status = 'active'
       GROUP BY e.external_employee_id, e.full_name
       ORDER BY count(ml.id) DESC
       LIMIT 15`
    ),
    query<{ period: string; cycles: string; dispensed: string; est_egp: string; approved_egp: string }>(
      `SELECT
         period,
         count(*)::text AS cycles,
         count(*) FILTER (WHERE status = 'dispensed')::text AS dispensed,
         coalesce(sum(estimated_total_egp),0)::text AS est_egp,
         coalesce(sum(approved_total_egp),0)::text AS approved_egp
       FROM refill_cycles
       GROUP BY period
       ORDER BY period DESC
       LIMIT 12`
    ),
    query<{ relation: string; n: string }>(
      `SELECT d.relation, count(*)::text AS n
       FROM chronic_programs cp
       JOIN dependents d ON d.id = cp.dependent_id
       WHERE cp.status = 'active'
       GROUP BY d.relation
       ORDER BY count(*) DESC`
    ),
  ]);

  const k = kpisRes.rows[0] || ({} as any);
  const eva = Number(k.eva_lines) || 0;
  const notEva = Number(k.not_eva_lines) || 0;
  const lines = eva + notEva;

  return {
    period,
    kpis: {
      active_programs: Number(k.active_programs) || 0,
      active_med_lines: Number(k.active_med_lines) || 0,
      unique_patients: Number(k.unique_patients) || 0,
      unique_employees: Number(k.unique_employees) || 0,
      eva_lines: eva,
      not_eva_lines: notEva,
      eva_pct: lines ? Math.round((eva / lines) * 1000) / 10 : 0,
      programs_with_docs: Number(k.programs_with_docs) || 0,
      refill_cycles_period: Number(k.refill_cycles) || 0,
      dispensed_period: Number(k.dispensed) || 0,
      in_review_period: Number(k.in_review) || 0,
      est_cost_period_egp: Number(k.est) || 0,
      approved_cost_period_egp: Number(k.appr) || 0,
    },
    top_drugs: topDrugs.rows.map((r) => ({
      drug_name: r.drug_name,
      line_count: Number(r.line_count) || 0,
      program_count: Number(r.program_count) || 0,
      total_qty: Number(r.total_qty) || 0,
      eva_count: Number(r.eva_count) || 0,
    })),
    formulary_mix: formulary.rows.map((r) => ({
      flag: r.flag,
      n: Number(r.n) || 0,
    })),
    top_employees_by_meds: topEmp.rows.map((r) => ({
      employee_id: r.employee_id,
      employee_name: r.employee_name,
      program_count: Number(r.program_count) || 0,
      med_count: Number(r.med_count) || 0,
    })),
    monthly_refills: monthly.rows.map((r) => ({
      period: r.period,
      cycles: Number(r.cycles) || 0,
      dispensed: Number(r.dispensed) || 0,
      est_egp: Number(r.est_egp) || 0,
      approved_egp: Number(r.approved_egp) || 0,
    })),
    relation_mix: relations.rows.map((r) => ({
      relation: r.relation,
      n: Number(r.n) || 0,
    })),
  };
}

export function analyticsToCsv(bundle: AnalyticsBundle): string {
  const lines: string[] = [];
  lines.push('section,key,value');
  for (const [k, v] of Object.entries(bundle.kpis)) {
    lines.push(`kpi,${k},${v}`);
  }
  lines.push('');
  lines.push('drug_name,line_count,program_count,total_qty,eva_count');
  for (const d of bundle.top_drugs) {
    lines.push(
      `"${d.drug_name.replace(/"/g, '""')}",${d.line_count},${d.program_count},${d.total_qty},${d.eva_count}`
    );
  }
  return lines.join('\n');
}
