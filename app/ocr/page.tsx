import Link from 'next/link';
import { hasOcrProvider } from '@/lib/prescriptionOcr';
import { ClinicalDisclaimer } from '@/components/ClinicalDisclaimer';
import { OcrForm } from './OcrForm';

export const dynamic = 'force-dynamic';

export default function OcrPage() {
  const providers = hasOcrProvider();
  const configured = providers.google || providers.ocr_space;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Prescription OCR</h1>
            <p className="text-sm text-slate-600">
              Roshetta image → text → med lines (qty + formulary match)
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/synonyms" className="text-blue-600 hover:underline">
              Synonyms
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
          </div>
        </header>

        <ClinicalDisclaimer
          extra="OCR output must be verified against the original prescription image before enroll or approve."
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
              You can still paste OCR text manually below.
            </p>
          )}
        </div>

        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <OcrForm />
        </section>

        <section className="rounded-xl border bg-white p-4 shadow-sm text-xs text-slate-600 space-y-2">
          <h2 className="font-medium text-sm text-slate-900">API</h2>
          <pre className="bg-slate-50 border rounded p-2 overflow-x-auto text-[11px]">{`GET  /api/ocr
POST /api/ocr  { "imageUrl": "https://drive.google.com/..." }
POST /api/ocr  { "text": "1 Crestor 20mg once daily\\n2 Glucophage 500" }`}</pre>
          <p>
            Drive files must be publicly readable (or use a direct image URL). Max ~12MB.
          </p>
        </section>

        <ClinicalDisclaimer compact />
      </div>
    </main>
  );
}
