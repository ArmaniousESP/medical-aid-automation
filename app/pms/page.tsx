import Link from 'next/link';
import { getPmsDashboard } from '@/lib/pspOps';
import { JOURNEY_LABELS_AR } from '@/lib/psp';

export const dynamic = 'force-dynamic';

export default async function PmsPage() {
  let data: Awaited<ReturnType<typeof getPmsDashboard>> | null = null;
  let error: string | null = null;

  try {
    data = await getPmsDashboard();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'فشل';
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">PMS · إدارة برنامج الدعم</h1>
            <p className="text-sm text-slate-600">
              نموذج Axios PSP — رحلة المريض · OTA · خطط التزام · أحداث ضارة
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/psp" className="text-blue-600 hover:underline">
              رحلة المرضى
            </Link>
            <Link href="/care-line" className="text-blue-600 hover:underline">
              Care Line
            </Link>
            <Link href="/notifications" className="text-blue-600 hover:underline">
              واتساب
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">برامج نشطة</div>
                <div className="text-3xl font-bold">{data.active_programs}</div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">مستحقو صرف {data.period}</div>
                <div className="text-3xl font-bold text-amber-700">
                  {data.due_refills_period}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">مراجعات التزام ≤7 أيام</div>
                <div className="text-3xl font-bold text-indigo-700">
                  {data.adherence_reviews_due_7d}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">أحداث ضارة مفتوحة</div>
                <div className="text-3xl font-bold text-red-700">
                  {data.open_adverse_events}
                </div>
              </div>
            </div>

            <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
              <h2 className="font-medium text-sm">On-Time Access (OTA)</h2>
              <p className="text-xs text-slate-500">
                الزمن من التسجيل إلى أول صرف — هدف Axios في الأسواق الناشئة تقليص
                فجوة الانتظار.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">لديهم أول صرف</div>
                  <div className="text-xl font-semibold">
                    {data.ota.programs_with_first_dispense}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">متوسط الأيام</div>
                  <div className="text-xl font-semibold">
                    {data.ota.avg_days_to_first_dispense ?? '—'}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">الوسيط (أيام)</div>
                  <div className="text-xl font-semibold">
                    {data.ota.median_days_to_first_dispense ?? '—'}
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <div className="text-xs text-slate-500">صرف خلال ≤7 أيام</div>
                  <div className="text-xl font-semibold text-emerald-800">
                    {data.ota.first_dispense_within_7_days}
                  </div>
                </div>
              </div>
            </section>

            <div className="grid md:grid-cols-2 gap-4">
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="font-medium text-sm mb-3">مراحل الرحلة</h2>
                <ul className="space-y-2 text-sm">
                  {Object.entries(data.by_stage).map(([s, n]) => (
                    <li key={s} className="flex justify-between">
                      <Link href={`/psp?stage=${s}`} className="text-blue-600 hover:underline">
                        {JOURNEY_LABELS_AR[s] || s}
                      </Link>
                      <span className="font-medium">{n}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="font-medium text-sm mb-3">توزيع PNAT (آخر تقييم)</h2>
                {Object.keys(data.by_risk).length === 0 ? (
                  <p className="text-sm text-slate-500">لا تقييمات بعد</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {Object.entries(data.by_risk).map(([r, n]) => (
                      <li key={r} className="flex justify-between">
                        <span>{r}</span>
                        <span className="font-medium">{n}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="rounded-xl border bg-white p-5 shadow-sm text-sm space-y-2">
              <h2 className="font-medium">مسار Axios PSP في هذا النظام</h2>
              <ol className="list-decimal list-inside text-slate-600 space-y-1 text-xs">
                <li>إحالة (النموذج / الشيت) → أهلية</li>
                <li>PNAT → خطة التزام شخصية + واتساب إن لزم</li>
                <li>تسجيل البرنامج · خطة علاجية (بنود أدوية)</li>
                <li>تقويم الصرف · Care Line · صيدلية</li>
                <li>متابعة · أحداث ضارة · اكتمال أو انقطاع مرمّز</li>
              </ol>
              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  href="/pharmacy"
                  className="rounded bg-indigo-600 px-3 py-1.5 text-white text-xs"
                >
                  الصيدلية
                </Link>
                <Link
                  href="/care-line"
                  className="rounded bg-blue-600 px-3 py-1.5 text-white text-xs"
                >
                  Care Line
                </Link>
                <Link
                  href="/analytics"
                  className="rounded border px-3 py-1.5 text-xs"
                >
                  تحليلات
                </Link>
              </div>
            </section>
          </>
        )}

        <p className="text-xs text-slate-400">
          API /api/psp/ops?dashboard=1 · مستوحى من Axios PMS / OTA (نموذج تشغيلي مفتوح)
        </p>
      </div>
    </main>
  );
}
