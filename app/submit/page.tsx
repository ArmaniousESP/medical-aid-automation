import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Beneficiary-facing guide (Arabic + English) for monthly aid form +
 * what photos to attach. Actual submission stays on Google Form.
 */
export default function SubmitGuidePage() {
  const formUrl =
    process.env.NEXT_PUBLIC_GOOGLE_FORM_URL ||
    process.env.GOOGLE_FORM_URL ||
    '';

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">تقديم طلب علاج شهري</h1>
          <p className="text-sm text-slate-600">Monthly medical aid — how to submit</p>
        </header>

        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4 text-sm leading-relaxed" dir="rtl">
          <p className="font-medium">المطلوب إرفاقه في الاستمارة:</p>
          <ol className="list-decimal list-inside space-y-2 text-slate-700">
            <li>
              <strong>روشتة حديثة</strong> واضحة (صورة من الموبايل جيدة الإضاءة، بدون قص
              أسماء الأدوية).
            </li>
            <li>
              <strong>فواتير الصيدلية</strong> إن وُجدت (للمبالغ المطلوب دعمها).
            </li>
            <li>أي مرفقات أخرى تطلبها الاستمارة (تحاليل / كارنيه حسب الحالة).</li>
          </ol>
          <p className="text-xs text-slate-500">
            نصائح للصورة: قرّب العدسة، أوقف الاهتزاز، تجنّب الظل على أسماء الأدوية.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-3 text-sm">
          <p className="font-medium">English checklist</p>
          <ul className="list-disc list-inside text-slate-700 space-y-1">
            <li>Clear photo of the current prescription (roshetta)</li>
            <li>Pharmacy invoice(s) if you are claiming amounts</li>
            <li>Submit only through the official Google Form</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          {formUrl ? (
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center rounded-lg bg-emerald-600 text-white py-3 font-medium hover:bg-emerald-700"
            >
              فتح استمارة التقديم / Open form
            </a>
          ) : (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
              Set <code>NEXT_PUBLIC_GOOGLE_FORM_URL</code> on Vercel to show the form
              button.
            </p>
          )}
          <Link
            href="/ocr"
            className="block text-center rounded-lg border bg-white py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Staff: OCR roshetta / invoice
          </Link>
          <Link href="/" className="text-center text-xs text-blue-600 hover:underline">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
