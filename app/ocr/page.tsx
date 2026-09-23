import Link from 'next/link';
import { hasOcrProvider } from '@/lib/prescriptionOcr';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';
import { OcrForm } from './OcrForm';

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
              Upload or Drive link → text → med lines / invoice total
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
          extra="OCR output must be verified against the original prescription or invoice before enroll or approve."
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
              Set <code className="bg-slate-100 px-1 rounded">GOOGLE_VISION_API_KEY</code> or{' '}
              <code className="bg-slate-100 px-1 rounded">OCR_SPACE_API_KEY</code> on Vercel.
              You can still paste text or upload for later once a key is set.
            </p>
          )}
          <p className="text-xs text-slate-500 pt-1">
            Private Drive form uploads: share the Form response folder with the
            service account email (Viewer).
          </p>
        </div>

        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <OcrForm />
        </section>

        <section className="rounded-xl border bg-white p-4 shadow-sm text-xs text-slate-600 space-y-2">
          <h2 className="font-medium text-sm text-slate-900">API</h2>
          <pre className="bg-slate-50 border rounded p-2 overflow-x-auto text-[11px]">{`GET  /api/ocr
POST /api/ocr  { "imageUrl": "https://drive.google.com/..." }
POST /api/ocr  { "imageBase64": "...", "mime": "image/jpeg" }
POST /api/ocr  { "urls": ["…roshetta", "…invoice"], "docKind": "auto" }
POST /api/ocr  { "text": "…", "docKind": "invoice" }`}</pre>
        </section>

        <p className="text-xs text-center text-slate-500">
          Beneficiaries submit via{' '}
          <a href={formUrl} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
            Google Form
          </a>
          {' '}· staff OCR here
        </p>

        <ClinicalDisclaimer compact />
      </div>
    </main>
  );
}
