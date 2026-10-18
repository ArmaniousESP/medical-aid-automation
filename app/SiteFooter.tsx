import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200/80 bg-white/70 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-white shadow-md"
                style={{
                  background:
                    'linear-gradient(135deg, #059669, #0d9488 55%, #6d28d9)',
                }}
                aria-hidden
              >
                MA
              </span>
              <div>
                <p className="font-semibold text-slate-900">Medical Aid</p>
                <p className="text-xs text-slate-500">Chronic medicine support</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              Employer programs for monthly treatment requests, pharmacy routing, and
              employee self-service — private by design.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs" dir="rtl">
              دعم العلاج الشهري للموظفين — التقديم والحالة وملف الموظف فقط للعامة.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
              For people
            </p>
            <ul className="space-y-1.5 text-slate-600">
              <li>
                <Link href="/intake" className="hover:text-emerald-700 transition">
                  Submit a request
                </Link>
              </li>
              <li>
                <Link
                  href="/request-status"
                  className="hover:text-emerald-700 transition"
                >
                  Check status
                </Link>
              </li>
              <li>
                <Link href="/me" className="hover:text-emerald-700 transition">
                  Employee profile
                </Link>
              </li>
              <li>
                <Link href="/guide" className="hover:text-emerald-700 transition">
                  How it works
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
              For organizations
            </p>
            <ul className="space-y-1.5 text-slate-600">
              <li>
                <Link
                  href="/org/register"
                  className="hover:text-violet-700 transition"
                >
                  Register your organization
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="hover:text-violet-700 transition">
                  Staff sign-in
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-violet-700 transition">
                  System status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
          <p>Secure · bilingual · mobile-first</p>
          <p dir="rtl">آمن · عربي / إنجليزي · مناسب للجوال</p>
        </div>
      </div>
    </footer>
  );
}
