'use client';

import Link from 'next/link';

type Props = {
  resultId: string;
  copied: boolean;
  linkCopied: boolean;
  onCopyId: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  onAnother: () => void;
};

/** Post-submit success — primary job is saving the Request ID. */
export function IntakeSuccess({
  resultId,
  copied,
  linkCopied,
  onCopyId,
  onShare,
  onCopyLink,
  onAnother,
}: Props) {
  return (
    <div className="rounded-2xl border-2 border-emerald-300/80 bg-emerald-50/95 p-5 space-y-4 shadow-lg shadow-emerald-600/10 backdrop-blur">
      <div className="text-center space-y-1">
        <p className="text-3xl" aria-hidden>
          ✓
        </p>
        <p className="font-semibold text-lg text-emerald-950">
          Request received · تم الاستلام
        </p>
        <p className="text-xs text-emerald-800">
          Save this ID — you need it to track status
        </p>
        <p className="text-xs text-emerald-800" dir="rtl">
          احفظ رقم الطلب لمتابعة الحالة
        </p>
      </div>

      <div className="rounded-xl bg-white/95 border border-emerald-200 px-3 py-3 text-center shadow-sm">
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
          Request ID · رقم الطلب
        </p>
        <p className="font-mono text-base sm:text-lg font-bold select-all break-all text-slate-900 mt-1">
          {resultId}
        </p>
      </div>

      <button
        type="button"
        onClick={onCopyId}
        className="aid-cta-primary w-full py-3.5 text-base"
      >
        {copied ? 'Copied ✓ · تم النسخ' : 'Copy Request ID · نسخ الرقم'}
      </button>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onShare}
          className="w-full rounded-xl border-2 border-emerald-600 bg-white py-3 text-sm font-semibold text-emerald-800"
        >
          Share link · مشاركة
        </button>
        <Link
          href={`/request-status?id=${encodeURIComponent(resultId)}`}
          className="block w-full rounded-xl bg-emerald-700 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Check status →
        </Link>
      </div>

      <button
        type="button"
        onClick={onCopyLink}
        className="w-full text-sm text-emerald-800 font-medium hover:underline"
      >
        {linkCopied ? 'Link copied ✓' : 'Copy status link only'}
      </button>

      <ol className="rounded-xl border border-emerald-100 bg-white/80 p-3 space-y-1.5 text-xs text-emerald-950">
        <li className="font-semibold text-emerald-900 mb-1">
          What happens next · ماذا بعد؟
        </li>
        <li>1. Staff reviews your medicines · مراجعة الأدوية</li>
        <li>2. Pharmacy routes EVA / Not EVA · توجيه الصيدلية</li>
        <li>3. Track anytime with this ID · تابع بنفس الرقم</li>
      </ol>

      <button
        type="button"
        onClick={onAnother}
        className="w-full text-sm text-slate-500 underline"
      >
        Submit another · طلب آخر
      </button>
    </div>
  );
}
