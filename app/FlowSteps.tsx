import Link from 'next/link';

const STEPS = [
  { n: 1, label: 'Queue', href: '/intake-ops' },
  { n: 2, label: 'Claims', href: '/claims' },
  { n: 3, label: 'Pharmacy', href: '/pharmacy' },
  { n: 4, label: 'Programs', href: '/programs' },
  { n: 5, label: 'Refills', href: '/refills' },
] as const;

/** Progress strip for staff path 1–5 */
export function FlowSteps({
  current,
}: {
  current: 1 | 2 | 3 | 4 | 5;
}) {
  return (
    <nav
      aria-label="Staff workflow"
      className="rounded-2xl border border-violet-100 bg-white/90 px-3 py-2.5 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600 mr-1">
          Path
        </span>
        {STEPS.map((s, i) => {
          const active = s.n === current;
          const done = s.n < current;
          return (
            <span key={s.n} className="inline-flex items-center gap-1">
              {i > 0 && (
                <span
                  className={`mx-0.5 h-0.5 w-2 sm:w-3 rounded ${
                    done || active ? 'bg-violet-300' : 'bg-slate-200'
                  }`}
                  aria-hidden
                />
              )}
              <Link
                href={s.href}
                aria-current={active ? 'step' : undefined}
                className={`inline-flex min-h-[2rem] items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? 'bg-violet-700 text-white shadow-sm'
                    : done
                      ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    active
                      ? 'bg-white/20'
                      : done
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-300 text-white'
                  }`}
                >
                  {done ? '✓' : s.n}
                </span>
                <span className="hidden xs:inline sm:inline">{s.label}</span>
              </Link>
            </span>
          );
        })}
        <Link
          href="/guide#for-staff"
          className="ml-auto text-[11px] font-medium text-violet-600 hover:underline"
        >
          Help
        </Link>
      </div>
      <p className="mt-1.5 text-[10px] text-slate-500 sm:hidden" dir="rtl">
        الخطوة {current} من 5
      </p>
    </nav>
  );
}
