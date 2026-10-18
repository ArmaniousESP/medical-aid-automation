'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { StaffAuthChip } from './StaffAuthChip';

/** Same order as AppNav Staff path and FlowSteps */
const STEPS = [
  { href: '/intake-ops', label: 'Queue', n: 1 },
  { href: '/claims', label: 'Claims', n: 2 },
  { href: '/pharmacy', label: 'Pharmacy', n: 3 },
  { href: '/programs', label: 'Programs', n: 4 },
  { href: '/refills', label: 'Refills', n: 5 },
];

/** Staff progress strip + Google Auth chip */
export function OpsStepsBar() {
  const pathname = usePathname() || '';

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="mb-4 rounded-2xl border border-violet-100/90 bg-white/90 p-3.5 shadow-sm backdrop-blur space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 mr-1">
          Staff path · مسار التشغيل
        </span>
        {STEPS.map((s, i) => (
          <span key={s.href} className="inline-flex items-center gap-1">
            {i > 0 && (
              <span className="text-violet-300 text-xs" aria-hidden>
                →
              </span>
            )}
            <Link
              href={s.href}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                active(s.href)
                  ? 'bg-violet-700 text-white shadow-sm shadow-violet-700/30'
                  : 'bg-violet-50 text-violet-800 ring-1 ring-violet-100 hover:bg-violet-100'
              }`}
            >
              {s.n}. {s.label}
            </Link>
          </span>
        ))}
        <Link
          href="/admin"
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            pathname.startsWith('/admin')
              ? 'bg-violet-700 text-white'
              : 'text-violet-700 hover:bg-violet-50'
          }`}
        >
          Admin
        </Link>
        <Link
          href="/guide#for-staff"
          className="text-[10px] font-medium text-violet-600 hover:underline ml-0.5"
        >
          Guide
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-violet-100/80 pt-2">
        <span className="text-[10px] text-violet-600 font-medium">Google Auth</span>
        <StaffAuthChip />
      </div>
    </div>
  );
}
