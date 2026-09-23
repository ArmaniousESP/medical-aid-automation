import Link from 'next/link';
import { hasOcrProvider } from '@/lib/prescriptionOcr';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';
import { OcrForm } from './OcrForm';
import { FormPreviewButton } from './FormPreviewButton';

export const dynamic = 'force-dynamic';

export default function OcrPage() {
  const providers = hasOcrProvider();
  const configured = providers.google || providers.ocr_space;
  const formUrl =
    process.env.NEXT_PUBLIC_GOOGLE_FORM_URL ||
    'https://docs.google.com/forms';

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Roshetta & invoice OCR</h1>
            <p className="text-sm text-slate-600">
              Upload or Drive link → form fields · invoice validation
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/submit" className="text-blue-600 hover:underline">
              Beneficiary guide
            </Link>
            <Link href="/documents" className="text-blue-600 hover:underline">
              Documents
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </div>
        </header>

        <ClinicalDisclaimer
          extra="OCR and invoice totals must be verified against the original images before enroll or approve."
        />

        <div className="rounded-xl border bg-white p-4 shadow-sm text-sm space-y-1">
          <div>
            Google Vision:{' '}
            <strong className={providers.google ? 'text-emerald-700' : 'text-amber-700'}>
              {providers.google ? 'configured' : 'not set'}
            </strong>
          </div>
          <div>
            OCR.space:{' '}
            <strong className={providers.ocr_space ? 'text-emerald-700' : 'text-slate-500'}>
              {providers.ocr_space ? 'configured' : 'not set'}
            </strong>
          </div>
          {!configured && (
            <p className="text-xs text-amber-800 pt-2">
              Set GOOGLE_VISION_API_KEY or OCR_SPACE_API_KEY on Vercel.
            </p>
          )}
          <p className="text-xs text-slate-500 pt-1">
            Invoice auto-price only when validation status is <strong>pass</strong>.
            Thresholds: INVOICE_WARN_PCT / INVOICE_FAIL_PCT.
          </p>
        </div>

        <FormPreviewButton />

        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <OcrForm />
        </section>

        <section className="rounded-xl border bg-white p-4 shadow-sm text-xs text-slate-600 space-y-2">
          <h2 className="font-medium text-sm text-slate-900">API</h2>
          <pre className="bg-slate-50 border rounded p-2 overflow-x-auto text-[11px]">{`POST /api/ocr
POST /api/ocr/form-preview  { "limit": 5, "emptyMedsOnly": true }
POST /api/ocr  { "action": "validate_invoice", "text": "…" }`}</pre>
        </section>

        <p className="text-xs text-center text-slate-500">
          Beneficiaries:{' '}
          <a href={formUrl} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
            Google Form
          </a>
        </p>

        <ClinicalDisclaimer compact />
      </div>
    </main>
  );
}
