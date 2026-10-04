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
  mock: 'submit' | 'status' | 'unlock' | 'queue' | 'process' | 'claims' | 'pharmacy' | 'none';
  id: string;
};

const PUBLIC_STEPS: Step[] = [
  {
    n: 1,
    id: 'public-1',
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
    id: 'public-2',
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

/** Matches top nav Staff path after PROCESS_SECRET */
const STAFF_STEPS: Step[] = [
  {
    n: 0,
    id: 'staff-0',
    titleEn: 'Unlock ops',
    titleAr: 'فتح لوحة التشغيل',
    bodyEn:
      'On Home, enter PROCESS_SECRET (set on Vercel). Cookie lasts 12 hours. Then use the numbered Staff path in the top bar.',
    bodyAr:
      'من الصفحة الرئيسية أدخل كلمة سر التشغيل. الجلسة 12 ساعة. ثم اتبع شريط Staff path المرقّم.',
    href: '/',
    cta: 'Go to Home unlock',
    mock: 'unlock',
  },
  {
    n: 1,
    id: 'staff-1',
    titleEn: 'Intake queue',
    titleAr: 'طابور الطلبات',
    bodyEn:
      'Filter submitted → Process platform intake (match + enroll + claim draft).',
    bodyAr:
      'صفّة submitted ثم Process platform intake (مطابقة + تسجيل + مسودة مطالبة).',
    href: '/intake-ops',
    cta: 'Open queue',
    mock: 'queue',
  },
  {
    n: 2,
    id: 'staff-2',
    titleEn: 'Claims',
    titleAr: 'المطالبات',
    bodyEn: 'Review draft amounts, then Submit each claim.',
    bodyAr: 'راجع المبالغ في المسودات ثم Submit.',
    href: '/claims',
    cta: 'Open claims',
    mock: 'claims',
  },
  {
    n: 3,
    id: 'staff-3',
    titleEn: 'Pharmacy',
    titleAr: 'الصيدلية',
    bodyEn:
      'Route orders by Available at Eva vs Not Eva. Export CSV for the pharmacy. Optional: EVA split screen for the same cut.',
    bodyAr:
      'قسّم الطلبات: متوفر عند إيفا / غير إيفا. صدّر CSV للصيدلية. يمكن استخدام شاشة EVA split.',
    href: '/pharmacy',
    cta: 'Open pharmacy',
    mock: 'pharmacy',
  },
  {
    n: 4,
    id: 'staff-4',
    titleEn: 'Programs',
    titleAr: 'البرامج المزمنة',
    bodyEn: 'Confirm chronic programs created after process. Search by name or code.',
    bodyAr: 'تأكد من البرامج بعد المعالجة. ابحث بالاسم أو الكود.',
    href: '/programs',
    cta: 'Open programs',
    mock: 'none',
  },
  {
    n: 5,
    id: 'staff-5',
    titleEn: 'Refills',
    titleAr: 'الصرف الشهري',
    bodyEn: 'Generate month cycle, open each cycle, approve (safety gate if flagged).',
    bodyAr: 'أنشئ دورة الشهر، افتح كل دورة، ووافق (مع بوابة السلامة إن لزم).',
    href: '/refills',
    cta: 'Open refills',
    mock: 'none',
  },
];

const MORE_TOOLS = [
  {
    href: '/notifications',
    title: 'Notifications · WhatsApp',
    titleAr: 'التنبيهات',
    body: 'Refill due reminders · safety ops alerts · email. Configure Meta or Twilio on Vercel.',
  },
  {
    href: '/formulary',
    title: 'Formulary',
    titleAr: 'القائمة الدوائية',
    body: 'Sync names used in programs · search · EVA filter. Supports Process matching.',
  },
  {
    href: '/eva-split',
    title: 'EVA split',
    titleAr: 'تقسيم إيفا',
    body: 'Count Available at Eva vs Not Eva. For CSV export prefer Pharmacy.',
  },
  {
    href: '/reports',
    title: 'Reports',
    titleAr: 'التقارير',
    body: 'Spend and enrollment summaries for the period.',
  },
  {
    href: '/status',
    title: 'System status',
    titleAr: 'حالة النظام',
    body: 'Database / env checks when something fails to load.',
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
  const label = s.n === 0 ? '○' : String(s.n);

  return (
    <li id={s.id} className="rounded-xl border bg-white p-5 shadow-sm space-y-3 scroll-mt-24">
      <div className="flex gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-bold ${badge}`}
        >
          {label}
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

        <nav
          aria-label="Guide sections"
          className="sticky top-14 z-30 rounded-xl border bg-white/95 backdrop-blur p-3 shadow-sm text-sm"
        >
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">
            Jump to · انتقل إلى
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="#for-you"
              className="rounded-full bg-emerald-100 text-emerald-900 px-3 py-1 text-xs font-medium hover:bg-emerald-200"
            >
              For you · للمستفيد
            </a>
            <a
              href="#for-staff"
              className="rounded-full bg-violet-100 text-violet-900 px-3 py-1 text-xs font-medium hover:bg-violet-200"
            >
              For staff · للتشغيل
            </a>
            <a
              href="#more-tools"
              className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-medium hover:bg-slate-200"
            >
              More tools
            </a>
            <a
              href="#privacy"
              className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-medium hover:bg-slate-200"
            >
              Privacy
            </a>
            {PUBLIC_STEPS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border px-2.5 py-1 text-xs text-emerald-800 hover:bg-emerald-50"
              >
                You · {s.n}. {s.titleEn.split(' ').slice(0, 2).join(' ')}
              </a>
            ))}
            {STAFF_STEPS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border px-2.5 py-1 text-xs text-violet-800 hover:bg-violet-50"
              >
                Ops · {s.n === 0 ? 'Unlock' : `${s.n}. ${s.titleEn.split(' ')[0]}`}
              </a>
            ))}
          </div>
        </nav>

        <section id="for-you" className="space-y-4 scroll-mt-28">
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
              <StepCard key={s.id} s={s} accent="emerald" />
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

        <section id="for-staff" className="space-y-4 scroll-mt-28">
          <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4">
            <h2 className="font-semibold text-violet-900 text-lg">For staff (ops)</h2>
            <p className="text-sm text-violet-800 mt-1" dir="rtl">
              لفريق التشغيل — نفس شريط Staff path في الأعلى بعد الفتح
            </p>
            <p className="text-sm text-violet-800 mt-2 font-mono text-xs sm:text-sm">
              Unlock → Queue → Claims → Pharmacy → Programs → Refills
            </p>
          </div>

          <ol className="space-y-4">
            {STAFF_STEPS.map((s) => (
              <StepCard key={s.id} s={s} accent="violet" />
            ))}
          </ol>
        </section>

        <section id="more-tools" className="space-y-4 scroll-mt-28">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-lg text-slate-900">More tools</h2>
            <p className="text-sm text-slate-600 mt-1">
              Under <strong>More ▾</strong> in the top bar — not part of the daily numbered path.
            </p>
            <p className="text-sm text-slate-600 mt-1" dir="rtl">
              أدوات إضافية من قائمة More — ليست خطوات يومية مرقّمة
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {MORE_TOOLS.map((t) => (
              <li
                key={t.href}
                className="rounded-xl border bg-white p-4 shadow-sm space-y-2"
              >
                <h3 className="font-medium">
                  {t.title}
                  <span className="text-slate-400 font-normal text-sm" dir="rtl">
                    {' '}
                    · {t.titleAr}
                  </span>
                </h3>
                <p className="text-xs text-slate-600">{t.body}</p>
                <Link
                  href={t.href}
                  className="inline-flex text-xs font-medium text-violet-700 hover:underline"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="privacy"
          className="rounded-xl border bg-white p-5 shadow-sm space-y-3 text-sm scroll-mt-28"
        >
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
            href="/intake"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Submit request
          </Link>
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
