import Link from 'next/link';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';
import { ReviewQueueClient } from './ReviewQueueClient';
import { FlowSteps } from '../FlowSteps';

export const dynamic = 'force-dynamic';

export default function ReviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <FlowSteps current={1} />
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Related to Queue · Review
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Review queue
              </h1>
              <p className="text-sm text-slate-600" dir="rtl">
                ثقة منخفضة من المسح أو المطابقة · تأكيد بشري قبل المعالجة
              </p>
            </div>
            <div className="hidden sm:flex flex-wrap gap-2 text-sm">
              <Link
                href="/ocr"
                className="rounded-xl border bg-white px-3 py-2 font-medium hover:bg-slate-50"
              >
                OCR
              </Link>
              <Link
                href="/intake-ops"
                className="rounded-xl bg-violet-700 px-3 py-2 font-semibold text-white"
              >
                Queue →
              </Link>
            </div>
          </div>
        </header>

        <ClinicalDisclaimer
          extra="Items here failed auto band or need invoice validation. Do not enroll without human check."
        />

        <ReviewQueueClient />

        <section className="rounded-2xl border bg-white p-4 text-xs text-slate-600 space-y-2 shadow-sm">
          <h2 className="font-medium text-sm text-slate-900">How gating works</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <code>OCR_FILL_EMPTY_MEDS=true</code> enables fill from roshetta
            </li>
            <li>
              <code>OCR_FILL_MIN_BAND=auto</code> (default) — only auto band fills
            </li>
            <li>
              Set <code>OCR_FILL_MIN_BAND=review</code> to also accept review band
            </li>
            <li>Invoice total still requires validation status pass</li>
          </ul>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-white/95 backdrop-blur p-3 md:hidden">
        <div className="mx-auto max-w-3xl flex gap-2">
          <Link
            href="/ocr"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
          >
            ← OCR
          </Link>
          <Link
            href="/intake-ops"
            className="flex-1 rounded-xl bg-violet-700 py-3 text-center text-sm font-semibold text-white"
          >
            Queue →
          </Link>
        </div>
      </div>
    </main>
  );
}
