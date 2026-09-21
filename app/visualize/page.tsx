import Link from 'next/link';
import { getMedicalAnalytics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

function defaultPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmt(n: number) {
  return n.toLocaleString('en-EG');
}

/** Horizontal bar row */
function HBar({
  label,
  value,
  max,
  color = 'bg-blue-500',
  suffix = '',
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs gap-2">
        <span className="truncate font-medium" title={label}>
          {label}
        </span>
        <span className="text-slate-500 shrink-0">
          {fmt(value)}
          {suffix}
        </span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Simple SVG donut for 2 segments */
function Donut({
  a,
  b,
  labelA,
  labelB,
}: {
  a: number;
  b: number;
  labelA: string;
  labelB: string;
}) {
  const total = a + b || 1;
  const r = 40;
  const c = 2 * Math.PI * r;
  const aLen = (a / total) * c;
  const bLen = (b / total) * c;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 100 100" className="shrink-0">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="12"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#10b981"
          strokeWidth="12"
          strokeDasharray={`${aLen} ${c - aLen}`}
          strokeDashoffset={c / 4}
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="12"
          strokeDasharray={`${bLen} ${c - bLen}`}
          strokeDashoffset={c / 4 - aLen}
          strokeLinecap="round"
        />
        <text
          x="50"
          y="52"
          textAnchor="middle"
          className="fill-slate-800"
          style={{ fontSize: '14px', fontWeight: 600 }}
        >
          {Math.round((a / total) * 100)}%
        </text>
      </svg>
      <div className="text-sm space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>
            {labelA}: <strong>{fmt(a)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-400" />
          <span>
            {labelB}: <strong>{fmt(b)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

/** SVG column chart for monthly series */
function ColumnChart({
  points,
}: {
  points: Array<{ period: string; cycles: number; dispensed: number }>;
}) {
  if (!points.length) {
    return (
      <p className="text-sm text-slate-500 p-4 text-center">لا بيانات شهرية بعد</p>
    );
  }
  const ordered = [...points].reverse();
  const max = Math.max(...ordered.map((p) => Math.max(p.cycles, p.dispensed)), 1);
  const w = 400;
  const h = 160;
  const pad = 28;
  const gap = 8;
  const barW = Math.max(
    8,
    (w - pad * 2) / ordered.length / 2 - gap / 2
  );

  return (
    <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full max-w-lg">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={pad}
          x2={w - pad}
          y1={h - t * (h - 10)}
          y2={h - t * (h - 10)}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}
      {ordered.map((p, i) => {
        const x0 = pad + i * ((w - pad * 2) / ordered.length);
        const ch = (p.cycles / max) * (h - 10);
        const dh = (p.dispensed / max) * (h - 10);
        return (
          <g key={p.period}>
            <rect
              x={x0}
              y={h - ch}
              width={barW}
              height={ch}
              fill="#3b82f6"
              rx="2"
            />
            <rect
              x={x0 + barW + 2}
              y={h - dh}
              width={barW}
              height={dh}
              fill="#10b981"
              rx="2"
            />
            <text
              x={x0 + barW}
              y={h + 14}
              textAnchor="middle"
              style={{ fontSize: '9px' }}
              className="fill-slate-500"
            >
              {p.period.slice(5)}
            </text>
          </g>
        );
      })}
      <text x={pad} y={12} style={{ fontSize: '10px' }} className="fill-blue-600">
        ■ دورات
      </text>
      <text x={pad + 55} y={12} style={{ fontSize: '10px' }} className="fill-emerald-600">
        ■ مصروف
      </text>
    </svg>
  );
}

export default async function VisualizePage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = searchParams.period || defaultPeriod();
  let data: Awaited<ReturnType<typeof getMedicalAnalytics>> | null = null;
  let error: string | null = null;

  try {
    data = await getMedicalAnalytics(period);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'فشل';
  }

  const k = data?.kpis;
  const topMax = data?.top_drugs[0]?.line_count || 1;
  const empMax = data?.top_employees_by_meds[0]?.med_count || 1;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">تصور البيانات الصحية</h1>
            <p className="text-sm text-slate-600">
              مخططات تفاعلية للبرامج المزمنة · EVA · الصرف
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/analytics" className="text-blue-600 hover:underline">
              التحليلات
            </Link>
            <Link href="/reports" className="text-blue-600 hover:underline">
              التقارير
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        <form className="flex gap-2 items-end text-sm">
          <div>
            <label className="block text-xs text-slate-500 mb-1">الشهر</label>
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="rounded border px-2 py-1.5"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-slate-800 px-3 py-1.5 text-white"
          >
            عرض
          </button>
        </form>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        {k && data && (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">برامج نشطة</div>
                <div className="text-3xl font-bold text-slate-800">
                  {fmt(k.active_programs)}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">مرضى</div>
                <div className="text-3xl font-bold text-indigo-700">
                  {fmt(k.unique_patients)}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">بنود دوائية</div>
                <div className="text-3xl font-bold text-blue-700">
                  {fmt(k.active_med_lines)}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">نسبة EVA</div>
                <div className="text-3xl font-bold text-emerald-700">
                  {k.eva_pct}%
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="font-medium mb-4 text-sm">توزيع الشركة (EVA)</h2>
                <Donut
                  a={k.eva_lines}
                  b={k.not_eva_lines}
                  labelA="Available in EVA"
                  labelB="NOT IN EVA"
                />
              </section>

              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="font-medium mb-4 text-sm">
                  الصرف الشهري — دورات vs مصروف
                </h2>
                <ColumnChart points={data.monthly_refills} />
              </section>
            </div>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="font-medium mb-4 text-sm">
                أعلى الأدوية (عدد البنود)
              </h2>
              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {data.top_drugs.slice(0, 15).map((d) => (
                  <HBar
                    key={d.drug_name}
                    label={d.drug_name}
                    value={d.line_count}
                    max={topMax}
                    color={
                      d.eva_count > d.line_count / 2
                        ? 'bg-emerald-500'
                        : 'bg-blue-500'
                    }
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-3">
                أخضر ≈ أغلب البنود EVA · أزرق ≈ خارج EVA
              </p>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="font-medium mb-4 text-sm">
                أعلى الموظفين بعدد الأدوية
              </h2>
              <div className="space-y-3">
                {data.top_employees_by_meds.slice(0, 12).map((e) => (
                  <HBar
                    key={e.employee_id}
                    label={`${e.employee_name} (${e.employee_id})`}
                    value={e.med_count}
                    max={empMax}
                    color="bg-violet-500"
                  />
                ))}
              </div>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="font-medium mb-4 text-sm">صلة القرابة</h2>
              <div className="space-y-3">
                {data.relation_mix.map((r) => {
                  const maxR = data.relation_mix[0]?.n || 1;
                  return (
                    <HBar
                      key={r.relation}
                      label={r.relation}
                      value={r.n}
                      max={maxR}
                      color="bg-amber-500"
                    />
                  );
                })}
              </div>
            </section>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-lg border bg-white p-3">
                <div className="text-xs text-slate-500">دورات {period}</div>
                <div className="text-xl font-semibold">
                  {fmt(k.refill_cycles_period)}
                </div>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <div className="text-xs text-slate-500">مصروف</div>
                <div className="text-xl font-semibold text-emerald-700">
                  {fmt(k.dispensed_period)}
                </div>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <div className="text-xs text-slate-500">قيد المراجعة</div>
                <div className="text-xl font-semibold text-amber-600">
                  {fmt(k.in_review_period)}
                </div>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <div className="text-xs text-slate-500">تكلفة تقديرية</div>
                <div className="text-lg font-semibold">
                  {fmt(Math.round(k.est_cost_period_egp))} EGP
                </div>
              </div>
            </div>
          </>
        )}

        <p className="text-xs text-slate-400">
          البيانات من Neon · نفس مصدر /api/analytics · بدون مكتبات رسم ثقيلة
        </p>
      </div>
    </main>
  );
}
