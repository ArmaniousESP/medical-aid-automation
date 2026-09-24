'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { UnlockPanel } from './UnlockPanel';

export default function Home() {
  return (
    <main className="min-h-screen text-slate-900">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Medical Aid</h1>
          <p className="text-slate-600">Monthly treatment support</p>
          <p className="text-sm text-slate-500" dir="rtl">
            دعم العلاج الشهري · تقديم الطلب ومتابعة الحالة
          </p>
        </header>

        {/* Public steps */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 text-center">
            For you · للمستفيد
          </h2>
          <div className="grid gap-3">
            <Link
              href="/intake"
              className="rounded-xl border bg-emerald-600 text-white p-5 hover:bg-emerald-700 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                  1
                </span>
                <div>
                  <div className="font-medium">Submit a request</div>
                  <div className="text-xs font-normal opacity-90 mt-0.5" dir="rtl">
                    تقديم طلب علاج شهري
                  </div>
                </div>
              </div>
            </Link>
            <Link
              href="/request-status"
              className="rounded-xl border bg-white p-5 hover:border-emerald-300 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold">
                  2
                </span>
                <div>
                  <div className="font-medium">Check request status</div>
                  <div className="text-xs text-slate-500 mt-0.5" dir="rtl">
                    متابعة حالة الطلب برقم الطلب
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <p className="text-center text-xs text-slate-500">
            <Link href="/guide" className="text-violet-700 underline font-medium">
              Full guide / الدليل الكامل
            </Link>
          </p>
        </section>

        {/* Staff */}
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 text-center">
            Staff only · للتشغيل
          </h2>
          <p className="text-xs text-slate-500 text-center">
            Unlock with PROCESS_SECRET, then use Ops menu: queue → process →
            claims → pharmacy
          </p>
          <Suspense fallback={null}>
            <UnlockPanel />
          </Suspense>
          <p className="text-center text-xs">
            <Link href="/guide" className="text-violet-700 underline">
              Staff steps in the guide
            </Link>
          </p>
        </section>

        <footer className="text-center text-xs text-slate-400 pb-6 space-y-1">
          <p>Patient lists are private. Only submit and status are public.</p>
          <p dir="rtl">قوائم المرضى غير عامة — التقديم ومتابعة الحالة فقط.</p>
        </footer>
      </div>
    </main>
  );
}
