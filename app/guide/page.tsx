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
      'On Home, tap Submit. Fill employee name, patient, and medicines (sections A–C). Optional: prescription links. After send you get a Request ID — copy it.',
    bodyAr:
      'من الرئيسية اختر تقديم. أدخل بيانات الموظف والمريض والأدوية. بعد الإرسال انسخ رقم الطلب واحفظه.',
    href: '/intake',
    cta: 'Open submit form',
    mock: 'submit',
  },
  {
    n: 2,
    id: 'public-2',
    titleEn: 'Check status anytime',
    titleAr: 'تابع حالة الطلب',
    bodyEn:
      'Paste your Request ID on the status page. Names are masked; medicine details stay private.',
    bodyAr:
      'الصق رقم الطلب في صفحة الحالة. الأسماء جزئية؛ تفاصيل الأدوية غير عامة.',
    href: '/request-status',
    cta: 'Open status page',
    mock: 'status',
  },
];

const STAFF_STEPS: Step[] = [
  {
    n: 0,
    id: 'staff-0',
    titleEn: 'Sign in / unlock',
    titleAr: 'تسجيل الدخول',
    bodyEn:
      'Open Admin (or Staff unlock on Home). Prefer Google Auth if configured, or enter PROCESS_SECRET. Then expand Staff tools in the top bar.',
    bodyAr:
      'افتح Admin أو قفل التشغيل من الرئيسية. يُفضّل Google، أو كلمة سر التشغيل. ثم افتح أدوات التشغيل في الشريط العلوي.',
    href: '/admin',
    cta: 'Open Admin',
    mock: 'unlock',
  },
  {
    n: 1,
    id: 'staff-1',
    titleEn: 'Queue',
    titleAr: 'الطابور',
    bodyEn:
      'Keep filter on Waiting. Tap Process queue (match + enroll + claim drafts). Then go to Claims.',
    bodyAr:
      'اترك التصفية على Waiting. اضغط معالجة الطابور ثم انتقل للمطالبات.',
    href: '/intake-ops',
    cta: 'Open Queue',
    mock: 'queue',
  },
  {
    n: 2,
    id: 'staff-2',
    titleEn: 'Claims',
    titleAr: 'المطالبات',
    bodyEn: 'Open Drafts, check totals, Submit each claim, then Pharmacy.',
    bodyAr: 'افتح المسودات، راجع المبالغ، Submit، ثم الصيدلية.',
    href: '/claims',
    cta: 'Open Claims',
    mock: 'claims',
  },
  {
    n: 3,
    id: 'staff-3',
    titleEn: 'Pharmacy',
    titleAr: 'الصيدلية',
    bodyEn:
      'Choose Available at EVA or Not at EVA. Download CSV for each route. Check safety flags before bulk dispense.',
    bodyAr:
      'اختر متوفر في إيفا أو غير متوفر. حمّل CSV لكل مسار. راجع تنبيهات السلامة قبل الصرف الجماعي.',
    href: '/pharmacy',
    cta: 'Open Pharmacy',
    mock: 'pharmacy',
  },
  {
    n: 4,
    id: 'staff-4',
    titleEn: 'Programs',
    titleAr: 'البرامج',
    bodyEn: 'Search chronic enrollments by name or code. Open a program for meds and history.',
    bodyAr: 'ابحث عن البرامج بالاسم أو الكود. افتح البرنامج لرؤية الأدوية.',
    href: '/programs',
    cta: 'Open Programs',
    mock: 'none',
  },
  {
    n: 5,
    id: 'staff-5',
    titleEn: 'Refills',
    titleAr: 'الصرف الشهري',
    bodyEn:
      'Generate this month’s cycles, review each cycle, then return to Pharmacy for CSV if needed.',
    bodyAr:
      'ولّد دورات الشهر، راجع كل دورة، ثم عد للصيدلية للتصدير إن لزم.',
    href: '/refills',
    cta: 'Open Refills',
    mock: 'none',
  },
];

const MORE_TOOLS = [
  {
    href: '/admin/roles',
    title: 'Roles',
    titleAr: 'الأدوار',
    body: 'admin · operator · viewer — who can run ops.',
  },
  {
    href: '/notifications',
    title: 'WhatsApp',
    titleAr: 'واتساب',
    body: 'Reminders and ops alerts (Meta or Twilio).',
  },
  {
    href: '/formulary',
    title: 'Formulary',
    titleAr: 'القائمة الدوائية',
    body: 'Names used in matching · EVA filter.',
  },
  {
    href: '/eva-split',
    title: 'EVA split',
    titleAr: 'تقسيم إيفا',
    body: 'Counts for Available vs Not Eva.',
  },
  {
    href: '/reports',
    title: 'Reports',
    titleAr: 'التقارير',
    body: 'Spend and enrollment summaries.',
  },
  {
    href: '/status',
    title: 'System status',
    titleAr: 'حالة النظام',
    body: 'Database and env checks.',
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
    <li
      id={s.id}
      className="rounded-2xl border bg-white p-5 shadow-sm space-y-4 scroll-mt-28"
    >
      <div className="flex gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white text-lg font-bold ${badge}`}
        >
          {label}
        </div>
        <div className="space-y-2 min-w-0 flex-1">
          <h3 className="font-semibold text-lg text-slate-900">{s.titleEn}</h3>
          <p className="text-sm font-medium text-slate-700" dir="rtl">
            {s.titleAr}
          </p>
          <p className="text-sm text-slate-600">{s.bodyEn}</p>
          <p className="text-sm text-slate-600" dir="rtl">
            {s.bodyAr}
          </p>
          <Link
            href={s.href}
            className={`inline-flex mt-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${btn}`}
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
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-10">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-2 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            Guide · الدليل
          </p>
          <h1 className="text-3xl font-bold tracking-tight">How to use Medical Aid</h1>
          <p className="text-slate-600" dir="rtl">
            خطوتان للمستفيد · خمس خطوات للتشغيل
          </p>
        </header>

        <nav
          aria-label="Guide sections"
          className="sticky top-14 z-30 rounded-2xl border bg-white/95 backdrop-blur p-3 shadow-sm"
        >
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <a
              href="#for-you"
              className="rounded-full bg-emerald-100 text-emerald-900 px-3.5 py-1.5 text-xs font-semibold"
            >
              For you · للمستفيد
            </a>
            <a
              href="#for-staff"
              className="rounded-full bg-violet-100 text-violet-900 px-3.5 py-1.5 text-xs font-semibold"
            >
              Staff · للتشغيل
            </a>
            <a
              href="#more-tools"
              className="rounded-full bg-slate-100 text-slate-700 px-3.5 py-1.5 text-xs font-semibold"
            >
              More tools
            </a>
            <a
              href="#privacy"
              className="rounded-full bg-slate-100 text-slate-700 px-3.5 py-1.5 text-xs font-semibold"
            >
              Privacy
            </a>
          </div>
        </nav>

        <section id="for-you" className="space-y-4 scroll-mt-28">
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
            <h2 className="font-bold text-emerald-950 text-lg">For you</h2>
            <p className="text-sm text-emerald-800 mt-1" dir="rtl">
              للمستفيدين — بدون تسجيل دخول
            </p>
            <p className="mt-3 text-sm font-semibold text-emerald-900">
              Submit → Copy Request ID → Check status
            </p>
          </div>

          <ol className="space-y-4">
            {PUBLIC_STEPS.map((s) => (
              <StepCard key={s.id} s={s} accent="emerald" />
            ))}
          </ol>

          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/intake"
              className="rounded-2xl bg-emerald-600 py-3.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Submit a request
            </Link>
            <Link
              href="/request-status"
              className="rounded-2xl border-2 border-emerald-200 bg-white py-3.5 text-center text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
            >
              Check my status
            </Link>
          </div>
        </section>

        <section id="for-staff" className="space-y-4 scroll-mt-28">
          <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-5">
            <h2 className="font-bold text-violet-950 text-lg">For staff</h2>
            <p className="text-sm text-violet-800 mt-1" dir="rtl">
              لفريق التشغيل — نفس الشريط المرقّم في الصفحات
            </p>
            <p className="mt-3 text-xs sm:text-sm font-semibold text-violet-900">
              Admin → Queue → Claims → Pharmacy → Programs → Refills
            </p>
          </div>

          <ol className="space-y-4">
            {STAFF_STEPS.map((s) => (
              <StepCard key={s.id} s={s} accent="violet" />
            ))}
          </ol>
        </section>

        <section id="more-tools" className="space-y-4 scroll-mt-28">
          <h2 className="font-bold text-lg">More tools</h2>
          <p className="text-sm text-slate-600">
            Under <strong>Staff tools → More</strong> — not part of the daily path.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {MORE_TOOLS.map((t) => (
              <li
                key={t.href}
                className="rounded-2xl border bg-white p-4 shadow-sm space-y-2"
              >
                <h3 className="font-semibold text-sm">
                  {t.title}
                  <span className="text-slate-400 font-normal" dir="rtl">
                    {' '}· {t.titleAr}
                  </span>
                </h3>
                <p className="text-xs text-slate-600">{t.body}</p>
                <Link
                  href={t.href}
                  className="inline-flex text-xs font-semibold text-violet-700 hover:underline"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="privacy"
          className="rounded-2xl border bg-white p-5 shadow-sm space-y-3 text-sm scroll-mt-28"
        >
          <h2 className="font-bold text-lg">Privacy</h2>
          <ul className="space-y-2 text-slate-600">
            <li>
              Public: <strong>Submit</strong> and <strong>Status</strong> only.
            </li>
            <li>
              Ops need Google sign-in (allowlist) or PROCESS_SECRET unlock.
            </li>
            <li dir="rtl">التفاصيل الطبية غير معروضة للعامة.</li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-3 justify-center pb-4">
          <Link
            href="/"
            className="rounded-2xl border bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"
          >
            Home
          </Link>
          <Link
            href="/admin"
            className="rounded-2xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800"
          >
            Staff Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
