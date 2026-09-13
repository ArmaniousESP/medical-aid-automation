import { query } from '@/lib/db';

export type DashboardStats = {
  programs_active: number;
  programs_total: number;
  med_lines_active: number;
  refills_in_review: number;
  refills_dispensed_this_month: number;
  estimated_this_month_egp: number;
  approved_this_month_egp: number;
  period: string;
};

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getDashboardStats(
  period = currentPeriod()
): Promise<DashboardStats> {
  const [prog, lines, review, month] = await Promise.all([
    query<{ active: string; total: string }>(
      `SELECT
         count(*) FILTER (WHERE status = 'active')::text AS active,
         count(*)::text AS total
       FROM chronic_programs`
    ),
    query<{ n: string }>(
      `SELECT count(*)::text AS n FROM chronic_med_lines WHERE is_active = true`
    ),
    query<{ n: string }>(
      `SELECT count(*)::text AS n FROM refill_cycles WHERE status = 'in_review'`
    ),
    query<{ dispensed: string; est: string; appr: string }>(
      `SELECT
         count(*) FILTER (WHERE status = 'dispensed')::text AS dispensed,
         coalesce(sum(estimated_total_egp), 0)::text AS est,
         coalesce(sum(approved_total_egp), 0)::text AS appr
       FROM refill_cycles WHERE period = $1`,
      [period]
    ),
  ]);

  return {
    programs_active: Number(prog.rows[0]?.active) || 0,
    programs_total: Number(prog.rows[0]?.total) || 0,
    med_lines_active: Number(lines.rows[0]?.n) || 0,
    refills_in_review: Number(review.rows[0]?.n) || 0,
    refills_dispensed_this_month: Number(month.rows[0]?.dispensed) || 0,
    estimated_this_month_egp: Number(month.rows[0]?.est) || 0,
    approved_this_month_egp: Number(month.rows[0]?.appr) || 0,
    period,
  };
}
