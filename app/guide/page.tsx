import Link from 'next/link';
import {
  MockSubmit,
  MockStatus,
  MockUnlock,
  MockQueue,
  MockClaims,
  MockPharmacy,
} from './GuideMocks';

export const dynamic = 'force-dynamic';

type Step = {
  n: number;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  href: string;
  cta: string;
  mock: 'submit' | 'status' | 'unlock' | 'queue' | 'process' | 'claims' | 'pharmacy';
};

const PUBLIC_STEPS: Step[] = [
  {
    n: 1,
    titleEn: 'Submit your request',
    titleAr: 'قدّم طلبك',
    bodyEn:
      'Fill in employee name, patient, and medicine names. You can paste roshetta links. You will receive a Request ID — save it.',
    bodyAr:
      'أدخل اسم الموظف والمريض وأسماء الأدوية. يمكن لصق روابط الروشتة. ستحصل على رقم طلب — احتفظ به.',
    href: '/intake',
    cta: 'Open form',
    mock: 'submit',
  },
  {
    n: 2,
    titleEn: 'Check status anytime',
    titleAr: 'تابع حالة الطلب',
    bodyEn:
      'Use your Request ID on the status page. Names are masked; medicine details stay private.',
    bodyAr:
      'استخدم رقم الطلب في صفحة الحالة. الأسماء جزئية؛ تفاصيل الأدوية غير معروضة للعامة.',
    href: '/request-status',
    cta: 'Check status',
    mock: 'status',
  },
];

const STAFF_STEPS: Step[] = [
  {
    n: 1,
    titleEn: 'Unlock ops',
    titleAr: 'فتح لوحة التشغيل',
    bodyEn:
      'On Home, enter PROCESS_SECRET (set on Vercel). Cookie lasts 12 hours.',
    bodyAr:
      'من الصفحة الرئيسية أدخل كلمة سر التشغيل (PROCESS_SECRET على Vercel). الجلسة 12 ساعة.',
    href: '/',
    cta: 'Go to Home unlock',
    mock: 'unlock',
  },
  {
    n: 2,
    titleEn: 'Review intake queue',
    titleAr: 'مراجعة طابور الطلبات',
    bodyEn: 'See new submitted requests before processing.',
    bodyAr: 'اطّلع على الطلبات الجديدة قبل المعالجة.',
    href: '/intake-ops',
    cta: 'Intake queue',
    mock: 'queue',
  },
  {
    n: 3,
    titleEn: 'Process (match + enroll)',
    titleAr: 'معالجة (مطابقة + تسجيل)',
    bodyEn:
      'Click Process platform intake. Medicines are matched; programs and claim drafts are created when enabled.',
    bodyAr:
      'اضغط Process platform intake. تتم مطابقة الأدوية وتسجيل البرنامج ومسودة المطالبة تلقائياً.',
    href: '/intake-ops',
    cta: 'Process',
    mock: 'queue',
  },
  {
    n: 4,
    titleEn: 'Claims',
    titleAr: 'المطالبات',
    bodyEn: 'Review draft amounts, then Submit.',
    bodyAr: 'راجع المبالغ ثم Submit.',
    href: '/claims',
    cta: 'Claims',
    mock: 'claims',
  },
  {
    n: 5,
    titleEn: 'Programs & pharmacy',
    titleAr: 'البرامج والصيدلية',
    bodyEn: 'Manage chronic programs and dispense from the pick list.',
    bodyAr: 'إدارة البرامج المزمنة والصرف من قائمة الصيدلية.',
    href: '/pharmacy',
    cta: 'Pharmacy',
    mock: 'pharmacy',
  },
];

function StepMock({ kind }: { kind: Step['mock'] }) {
  switch (kind) {
    case 'submit':
      return <MockSubmit />;
    case 'status':
      return <MockStatus />;
    case 'unlock':
      return <MockUnlock />;
    case 'queue':
    case 'process':
      return <MockQueue />;
    case 'claims':
      return <MockClaims />;
    case 'pharmacy':
      return <MockPharmacy />;
    default:
      return null;
  }
}

function StepCard({
  s,
  accent,
}: {
  s: Step;
  accent: 'emerald' | 'violet';
}) {
  const badge = accent === 'emerald' ? 'bg-emerald-600' : 'bg-violet-700';
  const btn =
    accent === 'emerald'
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : 'bg-violet-700 hover:bg-violet-800';

  return (
    <li className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
      <div className="flex gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-bold ${badge}`}
        >
          {s.n}
        </div>
        <div className="space-y-2 min-w-0 flex-1">
          <h3 className="font-semibold text-lg">{s.titleEn}</h3>
          <p className="text-sm text-slate-600">{s.bodyEn}</p>
          <p className="text-sm text-slate-700" dir="rtl">
            <span className="font-medium">{s.titleAr} — </span>
            {s.bodyAr}
          </p>
          <Link
            href={s.href}
            className={`inline-flex mt-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white ${btn}`}
          >
            {s.cta} →
          </Link>
        </div>
      </div>
      <StepMock kind={s.mock} />
    </li>
  );
}

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
            Getting started · دليل الاستخدام
          </p>
          <h1 className="text-3xl font-bold tracking-tight">How to use the platform</h1>
          <p className="text-slate-600" dir="rtl">
            لقطات موضّحة لكل خطوة · Annotated screens for each step
          </p>
        </header>

        <section className="space-y-4">
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
            <h2 className="font-semibold text-emerald-900 text-lg">
              For employees / beneficiaries
            </h2>
            <p className="text-sm text-emerald-800 mt-1" dir="rtl">
              للمستفيدين — بدون تسجيل دخول
            </p>
            <p className="text-sm text-emerald-800 mt-2 font-mono">
              Submit → save Request ID → Check status
            </p>
          </div>

          <ol className="space-y-4">
            {PUBLIC_STEPS.map((s) => (
              <StepCard key={s.n} s={s} accent="emerald" />
            ))}
          </ol>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/intake"
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Start: submit a request
            </Link>
            <Link
              href="/request-status"
              className="rounded-lg border bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
              Check status
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4">
            <h2 className="font-semibold text-violet-900 text-lg">For staff (ops)</h2>
            <p className="text-sm text-violet-800 mt-1" dir="rtl">
              لفريق التشغيل — بعد فتح القفل
            </p>
            <p className="text-sm text-violet-800 mt-2 font-mono text-xs sm:text-sm">
              Unlock → Queue → Process → Claims → Pharmacy
            </p>
          </div>

          <ol className="space-y-4">
            {STAFF_STEPS.map((s) => (
              <StepCard key={s.n} s={s} accent="violet" />
            ))}
          </ol>
        </section>

        <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3 text-sm">
          <h2 className="font-semibold text-lg">Privacy</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-600">
            <li>
              Only <strong>Submit</strong> and <strong>Check status</strong> are public.
            </li>
            <li>
              Ops screens require unlock with{' '}
              <code className="text-xs bg-slate-100 px-1 rounded">PROCESS_SECRET</code>.
            </li>
            <li dir="rtl">البيانات التفصيلية غير معروضة للعامة.</li>
          </ul>
          <p className="text-xs text-slate-400">
            Annotated frames are simplified UI maps (not live screenshots) so the
            guide stays accurate when the product changes.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 justify-center pb-8">
          <Link
            href="/"
            className="rounded-lg border bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
