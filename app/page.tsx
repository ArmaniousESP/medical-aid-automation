'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { UnlockPanel } from './UnlockPanel';

export default function Home() {
  return (
    <main className="min-h-screen text-slate-900 pb-24 md:pb-10">
      <div className="max-w-lg mx-auto px-4 pt-8 space-y-8">
        <header className="space-y-3 text-center">
          <p className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            Monthly medicine support · دعم العلاج الشهري
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            How can we help?
          </h1>
          <p className="text-base text-slate-600" dir="rtl">
            اختر خطوة واحدة فقط
          </p>
        </header>

        <section className="space-y-3" aria-label="For beneficiaries">
          <Link
            href="/intake"
            className="group block rounded-2xl bg-emerald-600 p-6 text-white shadow-md hover:bg-emerald-700 hover:shadow-lg transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold">
                1
              </span>
              <div className="text-left flex-1">
                <div className="text-lg font-semibold">Submit a request</div>
                <div className="text-sm opacity-90 mt-0.5" dir="rtl">
                  قدّم طلب علاج شهري جديد
                </div>
                <div className="text-xs opacity-75 mt-2">
                  About 3–5 minutes · ~٣–٥ دقائق
                </div>
              </div>
              <span className="text-2xl opacity-70">→</span>
            </div>
          </Link>

          <Link
            href="/request-status"
            className="group block rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-400 hover:shadow-md transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-bold text-emerald-800">
                2
              </span>
              <div className="text-left flex-1">
                <div className="text-lg font-semibold text-slate-900">
                  Check my status
                </div>
                <div className="text-sm text-slate-500 mt-0.5" dir="rtl">
                  تابع طلبك برقم الطلب
                </div>
              </div>
              <span className="text-2xl text-slate-300">→</span>
            </div>
          </Link>
        </section>

        <section className="rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-center text-slate-800">
            Simple path · المسار بسيط
          </h2>
          <ol className="space-y-3">
            <li className="flex gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border text-xs font-bold text-emerald-700">
                1
              </span>
              <span>
                <span className="text-slate-800">Submit — get a Request ID</span>
                <span className="block text-slate-500 text-xs mt-0.5" dir="rtl">
                  قدّم الطلب واحفظ رقم الطلب
                </span>
              </span>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border text-xs font-bold text-emerald-700">
                2
              </span>
              <span>
                <span className="text-slate-800">Staff reviews your medicines</span>
                <span className="block text-slate-500 text-xs mt-0.5" dir="rtl">
                  الفريق يراجع الأدوية
                </span>
              </span>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border text-xs font-bold text-emerald-700">
                3
              </span>
              <span>
                <span className="text-slate-800">Check status anytime with that ID</span>
                <span className="block text-slate-500 text-xs mt-0.5" dir="rtl">
                  تابع الحالة بنفس الرقم
                </span>
              </span>
            </li>
          </ol>
          <p className="text-center pt-1">
            <Link
              href="/guide"
              className="text-sm font-medium text-violet-700 hover:underline"
            >
              Full guide / الدليل الكامل
            </Link>
          </p>
        </section>

        <details className="rounded-2xl border border-dashed border-slate-300 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center justify-between">
            <span>
              Staff unlock{' '}
              <span className="text-slate-400 font-normal" dir="rtl">
                · للتشغيل فقط
              </span>
            </span>
            <span className="text-xs text-slate-400">tap to open</span>
          </summary>
          <div className="border-t px-4 pb-4 pt-3 space-y-2">
            <p className="text-xs text-slate-500 text-center">
              Queue → Claims → Pharmacy → Programs → Refills
            </p>
            <Suspense fallback={<p className="text-xs text-slate-400">Loading…</p>}>
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
