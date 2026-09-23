import Link from 'next/link';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';
import { ReviewQueueClient } from './ReviewQueueClient';

export const dynamic = 'force-dynamic';

export default function ReviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Review queue</h1>
            <p className="text-sm text-slate-600">
              Low-confidence OCR / match — staff confirm before process
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/ocr" className="text-blue-600 hover:underline">
              OCR
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </div>
        </header>

        <ClinicalDisclaimer
          extra="Items here failed auto band or need invoice validation. Do not enroll without human check."
        />

        <ReviewQueueClient />

        <section className="rounded-xl border bg-white p-4 text-xs text-slate-600 space-y-2">
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
    </main>
  );
}
