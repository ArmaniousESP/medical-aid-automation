import { BrandMark } from './BrandMark';

/** Shown while Next.js loads a route segment */
export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="animate-pulse">
        <BrandMark size="md" showTitle={false} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-slate-700">Loading…</p>
        <p className="text-xs text-slate-500" dir="rtl">
          جاري التحميل…
        </p>
        <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-emerald-500" />
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
