import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    n: 1,
    titleAr: 'المستفيد يقدّم الطلب',
    titleEn: 'Beneficiary submits',
    bodyAr:
      'افتح نموذج المنصة وأدخل بيانات الموظف والمريض وأسماء الأدوية. يمكن إرفاق روابط الروشتة. لا حاجة لاستمارة Google.',
    bodyEn:
      'Open the platform form. Enter employee, patient, and medicine names. Optional roshetta links. No Google Form required.',
    href: '/intake',
    cta: 'Open intake form',
    who: 'Beneficiary / employee',
  },
  {
    n: 2,
    titleAr: 'مراجعة طابور الطلبات',
    titleEn: 'Ops reviews intake queue',
    bodyAr:
      'تظهر الطلبات الجديدة بحالة submitted. راقب القائمة وتأكد من اكتمال البيانات قبل المعالجة.',
    bodyEn:
      'New requests appear as submitted. Check the list before processing.',
    href: '/intake-ops',
    cta: 'Open intake queue',
    who: 'Ops / admin',
  },
  {
    n: 3,
    titleAr: 'تشغيل المعالجة (مطابقة + تسجيل)',
    titleEn: 'Process (match + enroll)',
    bodyAr:
      'من الرئيسية أو طابور الطلبات اضغط Process platform intake. النظام يطابق الأدوية ويسجّل البرنامج المزمن تلقائياً (إن كان الإعداد مفعّلاً).',
    bodyEn:
      'From Home or Intake queue, click Process platform intake. The system matches medicines and auto-enrolls the chronic program when enabled.',
    href: '/intake-ops',
    cta: 'Go process',
    who: 'Ops / admin',
  },
  {
    n: 4,
    titleAr: 'المطالبات المالية',
    titleEn: 'Claims',
    bodyAr:
      'بعد التسجيل يمكن إنشاء مسودة مطالبة. راجع المبالغ ثم Submit إن وُجد نظام خارجي.',
    bodyEn:
      'After enroll, claim drafts can be created. Review amounts, then Submit if an external claims webhook is configured.',
    href: '/claims',
    cta: 'Open claims',
    who: 'Ops / finance',
  },
  {
    n: 5,
    titleAr: 'البرامج والصرف',
    titleEn: 'Programs & pharmacy',
    bodyAr:
      'راجع البرامج المزمنة، جهّز الصرف الشهري من الصيدلية والمخزون.',
    bodyEn:
      'Review chronic programs, prepare monthly refills from pharmacy and inventory.',
    href: '/programs',
    cta: 'Open programs',
    who: 'Ops / pharmacy',
  },
  {
    n: 6,
    titleAr: 'أدوات إضافية عند الحاجة',
    titleEn: 'Extra tools when needed',
    bodyAr:
      'OCR للروشتات، طابور المراجعة، سلامة الأدوية، تقسيم EVA، واتساب — من قائمة More في الشريط العلوي.',
    bodyEn:
      'OCR, review queue, drug safety, EVA split, WhatsApp — under More in the top nav.',
    href: '/ocr',
    cta: 'OCR tools',
    who: 'Ops',
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
            Getting started
          </p>
          <h1 className="text-3xl font-bold tracking-tight">How to use the platform</h1>
          <p className="text-slate-600" dir="rtl">
            دليل مختصر لدورة دعم العلاج الشهري — من تقديم الطلب حتى الصرف
          </p>
        </header>

        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          <p className="font-medium mb-1">Primary cycle (no Google required)</p>
          <p className="font-mono text-xs sm:text-sm break-all">
            Submit → Intake queue → Process → Claims → Programs / Pharmacy
          </p>
        </div>

        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="rounded-xl border bg-white p-5 shadow-sm flex gap-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-700 text-white font-bold">
                {s.n}
              </div>
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="font-semibold text-lg">{s.titleEn}</h2>
                  <span className="text-xs text-slate-400">{s.who}</span>
                </div>
                <p className="text-sm text-slate-600">{s.bodyEn}</p>
                <p className="text-sm text-slate-700" dir="rtl">
                  <span className="font-medium">{s.titleAr} — </span>
                  {s.bodyAr}
                </p>
                <Link
                  href={s.href}
                  className="inline-flex mt-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                >
                  {s.cta} →
                </Link>
              </div>
            </li>
          ))}
        </ol>

        <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3 text-sm">
          <h2 className="font-semibold text-lg">Tips</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-600">
            <li>
              Unlock admin tools with the password panel on Home if{' '}
              <code className="text-xs bg-slate-100 px-1 rounded">PROCESS_SECRET</code> is set.
            </li>
            <li>
              Sheet “Process new responses” is <strong>legacy</strong> — use platform intake for new work.
            </li>
            <li>
              Optional env: <code className="text-xs bg-slate-100 px-1 rounded">AUTO_ENROLL_INTAKE</code>,{' '}
              <code className="text-xs bg-slate-100 px-1 rounded">AUTO_CLAIM_ON_ENROLL</code>.
            </li>
            <li>
              System health: <Link href="/status" className="text-blue-600 underline">/status</Link>
            </li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-3 justify-center pb-8">
          <Link
            href="/intake"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Start: submit a request
          </Link>
          <Link
            href="/intake-ops"
            className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-800"
          >
            Ops: intake queue
          </Link>
          <Link href="/" className="rounded-lg border bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-50">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
