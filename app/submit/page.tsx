import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Beneficiary guide — platform intake is primary; Google Form is optional legacy.
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
          <p className="text-sm text-slate-600">
            Platform intake · MSH catalog · full cycle on Neon
          </p>
        </header>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-3 text-sm">
          <p className="font-medium text-emerald-900">الطريقة الموصى بها</p>
          <p className="text-emerald-800">
            قدّم الطلب مباشرة على المنصة — بدون Google Form. البيانات تُحفظ في قاعدة
            البيانات وتُعالج من نفس النظام (مطابقة · صيدلية · برامج مزمنة).
          </p>
          <Link
            href="/intake"
            className="block text-center rounded-lg bg-emerald-600 text-white py-3 font-medium hover:bg-emerald-700"
          >
            فتح نموذج المنصة / Open platform form
          </Link>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4 text-sm leading-relaxed" dir="rtl">
          <p className="font-medium">المطلوب إرفاقه:</p>
          <ol className="list-decimal list-inside space-y-2 text-slate-700">
            <li>
              <strong>روشتة حديثة</strong> واضحة (رابط Drive أو URL في النموذج).
            </li>
            <li>
              <strong>فواتير الصيدلية</strong> إن وُجدت.
            </li>
            <li>أسماء الأدوية والكميات — يمكن البحث عبر كتالوج MSH.</li>
          </ol>
        </div>

        {formUrl && (
          <div className="rounded-xl border bg-white p-4 text-xs text-slate-600 space-y-2">
            <p className="font-medium">Legacy Google Form (optional)</p>
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline break-all"
            >
              {formUrl}
            </a>
          </div>
        )}

        <div className="flex flex-col gap-2 text-center text-sm">
          <Link href="/ocr" className="text-blue-600 hover:underline">
            Staff: OCR
          </Link>
          <Link href="/" className="text-xs text-slate-500 hover:underline">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
