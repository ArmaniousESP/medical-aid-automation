'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { UnlockPanel } from './UnlockPanel';
import { GetAppButton } from './GetAppButton';
import { HomeContinuity } from './HomeContinuity';

export default function Home() {
  return (
    <main className="min-h-screen text-slate-900 pb-24 md:pb-10">
      <div className="max-w-lg mx-auto px-4 pt-8 space-y-7">
        <header className="space-y-3 text-center aid-rise">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100/80 shadow-sm backdrop-blur">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]"
              aria-hidden
            />
            Monthly medicine support · دعم العلاج الشهري
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            How can we help?
          </h1>
          <p className="text-base text-slate-600" dir="rtl">
            اختر خطوة واحدة فقط
          </p>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            No account needed · بدون حساب — submit, then track with your Request ID.
          </p>
        </header>

        <HomeContinuity />

        <section className="space-y-3" aria-label="For beneficiaries">
          <Link
            href="/intake"
            className="aid-cta-primary aid-rise aid-rise-delay-1 group block p-6 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold ring-1 ring-white/30">
                1
              </span>
              <div className="text-left flex-1 min-w-0">
                <div className="text-xl font-semibold">Submit a request</div>
                <div className="text-sm opacity-90 mt-0.5" dir="rtl">
                  قدّم طلب علاج شهري جديد
                </div>
                <div className="text-xs opacity-80 mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span>About 3–5 min</span>
                  <span aria-hidden>·</span>
                  <span dir="rtl">~٣–٥ دقائق</span>
                  <span aria-hidden>·</span>
                  <span>Auto-saves as you type</span>
                </div>
              </div>
              <span
                className="text-2xl opacity-80 group-hover:translate-x-0.5 transition"
                aria-hidden
              >
                →
              </span>
            </div>
          </Link>

          <Link
            href="/request-status"
            className="aid-rise aid-rise-delay-2 group block rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-sm backdrop-blur hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-600/10 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 text-2xl font-bold text-emerald-800 ring-1 ring-emerald-100">
                2
              </span>
              <div className="text-left flex-1 min-w-0">
                <div className="text-xl font-semibold text-slate-900">
                  Check my status
                </div>
                <div className="text-sm text-slate-500 mt-0.5" dir="rtl">
                  تابع طلبك برقم الطلب
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Paste your Request ID · or open from the banner above
                </div>
              </div>
              <span
                className="text-2xl text-slate-300 group-hover:text-emerald-500 transition"
                aria-hidden
              >
                →
              </span>
            </div>
          </Link>

          <div className="aid-rise aid-rise-delay-3">
            <GetAppButton variant="outline" />
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs text-slate-600">
          {[
            { en: 'No login', ar: 'بدون تسجيل' },
            { en: 'Save your ID', ar: 'احفظ الرقم' },
            { en: 'Egypt prices', ar: 'أسعار مصر' },
          ].map((chip) => (
            <div
              key={chip.en}
              className="rounded-2xl bg-white/70 border border-white/80 px-2 py-2.5 shadow-sm backdrop-blur"
            >
              <div className="font-semibold text-slate-800">{chip.en}</div>
              <div className="text-slate-500 mt-0.5" dir="rtl">
                {chip.ar}
              </div>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-white/80 bg-white/75 p-5 space-y-3 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold text-center text-slate-800">
            Three steps · ثلاث خطوات
          </h2>
          <ol className="space-y-3">
            {[
              {
                n: '1',
                en: 'Submit — copy your Request ID',
                ar: 'قدّم الطلب وانسخ رقم الطلب',
              },
              {
                n: '2',
                en: 'Staff reviews medicines & pharmacy',
                ar: 'الفريق يراجع الأدوية والصيدلية',
              },
              {
                n: '3',
                en: 'Check status anytime with that ID',
                ar: 'تابع الحالة بنفس الرقم متى شئت',
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 text-xs font-bold text-emerald-800">
                  {step.n}
                </span>
                <span>
                  <span className="text-slate-800">{step.en}</span>
                  <span className="block text-slate-500 text-xs mt-0.5" dir="rtl">
                    {step.ar}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-center pt-1 space-x-2">
            <Link
              href="/guide"
              className="text-sm font-medium text-violet-700 hover:underline"
            >
              Full guide
            </Link>
            <span className="text-slate-300">·</span>
            <Link
              href="/guide#for-you"
              className="text-sm font-medium text-emerald-700 hover:underline"
              dir="rtl"
            >
              للمستفيد
            </Link>
          </p>
        </section>

        <details className="rounded-2xl border border-dashed border-slate-300/90 bg-white/80 backdrop-blur group shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center justify-between gap-2">
            <span>
              Staff unlock{' '}
              <span className="text-slate-400 font-normal" dir="rtl">
                · للتشغيل فقط
              </span>
            </span>
            <span className="text-xs text-slate-400 group-open:hidden">tap to open</span>
            <span className="text-xs text-slate-400 hidden group-open:inline">close</span>
          </summary>
          <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
            <p className="text-xs text-slate-500 text-center">
              Queue → Claims → Pharmacy → Programs → Refills
            </p>
            <Suspense
              fallback={
                <p className="text-xs text-slate-400 text-center py-2">Loading staff tools…</p>
              }
            >
              <UnlockPanel />
            </Suspense>
          </div>
        </details>

        <footer className="text-center text-xs text-slate-400 pb-4 space-y-1">
          <p>Your data is private. Only submit & status are public.</p>
          <p dir="rtl">بياناتك خاصة — التقديم والحالة فقط للعامة.</p>
        </footer>
      </div>
    </main>
  );
}
