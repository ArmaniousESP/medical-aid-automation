'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Same order as AppNav Staff path and FlowSteps */
const STEPS = [
  { href: '/intake-ops', label: 'Queue', n: 1 },
  { href: '/claims', label: 'Claims', n: 2 },
  { href: '/pharmacy', label: 'Pharmacy', n: 3 },
  { href: '/programs', label: 'Programs', n: 4 },
  { href: '/refills', label: 'Refills', n: 5 },
];

/** Optional staff progress strip (pages may use FlowSteps instead) */
export function OpsStepsBar() {
  const pathname = usePathname() || '';

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50/80 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-violet-500 mr-1">
          Staff path
        </span>
        {STEPS.map((s, i) => (
          <span key={s.href} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-violet-300 text-xs">→</span>}
            <Link
              href={s.href}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                active(s.href)
                  ? 'bg-violet-700 text-white'
                  : 'bg-white text-violet-800 border border-violet-200 hover:bg-violet-100'
              }`}
            >
              {s.n}. {s.label}
            </Link>
          </span>
        ))}
        <Link
          href="/guide#for-staff"
          className="ml-auto text-[10px] text-violet-600 hover:underline"
        >
          Guide
        </Link>
      </div>
    </div>
  );
}
