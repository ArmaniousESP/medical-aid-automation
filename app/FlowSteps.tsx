import Link from 'next/link';

/** Same order as AppNav Staff path and Unlock checklist */
const STEPS = [
  { n: 1, label: 'Queue', href: '/intake-ops' },
  { n: 2, label: 'Claims', href: '/claims' },
  { n: 3, label: 'Pharmacy', href: '/pharmacy' },
  { n: 4, label: 'Programs', href: '/programs' },
  { n: 5, label: 'Refills', href: '/refills' },
] as const;

/** Compact progress strip — highlight current step number 1–5 */
export function FlowSteps({
  current,
}: {
  current: 1 | 2 | 3 | 4 | 5;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 mr-1">
        Staff
      </span>
      {STEPS.map((s, i) => {
        const active = s.n === current;
        const done = s.n < current;
        return (
          <span key={s.n} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-slate-300 mx-0.5">→</span>}
            <Link
              href={s.href}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                active
                  ? 'bg-violet-700 text-white'
                  : done
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span className="tabular-nums">{s.n}</span>
              {s.label}
            </Link>
          </span>
        );
      })}
      <Link
        href="/guide#for-staff"
        className="ml-1 text-violet-600 hover:underline"
      >
        Guide
      </Link>
    </div>
  );
}
