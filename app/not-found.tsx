import Link from 'next/link';
import { BrandMark } from './BrandMark';

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <BrandMark size="md" showTitle={false} />
      <div className="space-y-2 max-w-sm">
        <p className="text-4xl font-bold text-emerald-700">404</p>
        <h1 className="text-xl font-bold text-slate-900">Page not found</h1>
        <p className="text-sm text-slate-600" dir="rtl">
          الصفحة غير موجودة
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <Link
          href="/"
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Home · الرئيسية
        </Link>
        <Link
          href="/intake"
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Submit request
        </Link>
        <Link
          href="/request-status"
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Check status
        </Link>
      </div>
    </main>
  );
}
