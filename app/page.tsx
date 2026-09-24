'use client';

import { Suspense, useState } from 'react';
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

        <div className="grid gap-3">
          <Link
            href="/intake"
            className="rounded-xl border bg-emerald-600 text-white p-5 text-center font-medium hover:bg-emerald-700 shadow-sm"
          >
            Submit a request
            <div className="text-xs font-normal opacity-90 mt-1" dir="rtl">
              تقديم طلب علاج شهري
            </div>
          </Link>
          <Link
            href="/request-status"
            className="rounded-xl border bg-white p-5 text-center font-medium hover:border-violet-300 shadow-sm"
          >
            Check request status
            <div className="text-xs font-normal text-slate-500 mt-1" dir="rtl">
              متابعة حالة الطلب
            </div>
          </Link>
          <Link
            href="/guide"
            className="rounded-xl border bg-white p-4 text-center text-sm text-slate-600 hover:bg-slate-50"
          >
            How to use / طريقة الاستخدام
          </Link>
        </div>

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 space-y-3">
          <p className="text-xs text-slate-500 text-center">
            Staff only — unlock ops with PROCESS_SECRET
          </p>
          <Suspense fallback={null}>
            <UnlockPanel />
          </Suspense>
        </div>

        <footer className="text-center text-xs text-slate-400 pb-6">
          Patient data is not publicly listed. Only submit and status lookup are
          open.
        </footer>
      </div>
    </main>
  );
}
