import Link from 'next/link';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';
import { FlowSteps } from '../FlowSteps';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    title: '1. Import DDInter data',
    title_ar: 'استيراد بيانات التفاعلات',
    href: '/ddinter',
    body: 'Load at least ATC file B (or all files). Without pairs, interaction severity stays empty.',
  },
  {
    title: '2. Map Egypt brands → ingredients',
    title_ar: 'ربط الأسماء التجارية بالمواد الفعالة',
    href: '/synonyms',
    body: 'Seed builtin synonyms, then add missing trade names (Gliptus, Empixera, …).',
  },
  {
    title: '3. Document patient allergies',
    title_ar: 'تسجيل حساسية المريض',
    href: '/programs',
    body: 'On each program, add allergen + severity. High hits appear as Allergy risk badge.',
  },
  {
    title: '4. Review combinations before pharmacy batch',
    title_ar: 'مراجعة التركيبات قبل دفعة الصيدلية',
    href: '/combinations',
    body: 'See common co-prescriptions, DDInter levels, and regimens with Major hits.',
  },
  {
    title: '5. Work the refill safety queue',
    title_ar: 'معالجة طابور سلامة الصرف',
    href: '/refills/safety',
    body: 'Cycles with DDI Major or allergy High. Open each, check acknowledge, then approve/dispense.',
  },
  {
    title: '6. Escalate Major / High — do not silent-auto-approve',
    title_ar: 'تصعيد الحالات الخطرة — لا تعتمد تلقائياً',
    href: '/pharmacy',
    body: 'Route alerts to pharmacist. Soft gate requires acknowledge_safety; tools are triage, not a clinical lock.',
  },
];

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={5} />
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                More tools · Safety
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Safety checklist
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                قائمة سلامة · تفاعلات · حساسية · طابور الصرف
              </p>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 text-sm">
              <Link
                href="/refills/safety"
                className="rounded-xl bg-violet-700 px-3 py-2 font-semibold text-white hover:bg-violet-800"
              >
                Safety queue →
              </Link>
              <Link
                href="/notifications"
                className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50"
              >
                Notifications
              </Link>
            </div>
          </div>
        </header>

        <ClinicalDisclaimer />

        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li
              key={s.title}
              className="rounded-2xl border bg-white p-4 shadow-sm space-y-1"
            >
              <Link
                href={s.href}
                className="font-semibold text-sm text-violet-800 hover:underline"
              >
                {s.title}
              </Link>
              <p className="text-xs text-slate-500" dir="rtl">
                {s.title_ar}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>

        <section className="rounded-2xl border bg-white p-4 shadow-sm text-xs text-slate-600 space-y-2">
          <h2 className="font-medium text-sm text-slate-900">Quick API examples</h2>
          <pre className="bg-slate-50 border rounded-xl p-3 overflow-x-auto text-[11px]">{`GET  /api/ddinter/check?drugs=Warfarin,Aspirin
GET  /api/allergies?program_id=UUID
GET  /api/synonyms?resolve=Gliptus%20plus
GET  /api/refills/safety-queue?limit=40`}</pre>
          <p>
            Full guide:{' '}
            <code className="bg-slate-100 px-1 rounded">docs/clinical-tools-usage.md</code>
          </p>
        </section>

        <ClinicalDisclaimer compact />
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-white/95 backdrop-blur p-3 md:hidden">
        <div className="mx-auto max-w-3xl flex gap-2">
          <Link
            href="/notifications"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← Alerts
          </Link>
          <Link
            href="/refills/safety"
            className="flex-1 rounded-xl bg-violet-700 py-3 text-center text-sm font-semibold text-white"
          >
            Safety queue →
          </Link>
        </div>
      </div>
    </main>
  );
}
