'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { StaffAuthChip } from './StaffAuthChip';
import { GetAppButton } from './GetAppButton';

const PUBLIC = [
  { href: '/', label: 'Home', labelAr: 'الرئيسية' },
  { href: '/intake', label: 'Submit request', labelAr: 'تقديم طلب' },
  { href: '/request-status', label: 'My status', labelAr: 'حالة طلبي' },
  { href: '/guide', label: 'Help', labelAr: 'مساعدة' },
];

const OPS_PRIMARY = [
  { href: '/intake-ops', label: '1 Queue', hint: 'New requests' },
  { href: '/claims', label: '2 Claims', hint: 'Review' },
  { href: '/pharmacy', label: '3 Pharmacy', hint: 'EVA lists' },
  { href: '/programs', label: '4 Programs', hint: 'Chronic' },
  { href: '/refills', label: '5 Refills', hint: 'Monthly' },
];

const OPS_MORE = [
  { href: '/admin', label: 'Admin panel' },
  { href: '/admin/roles', label: 'Roles' },
  { href: '/notifications', label: 'WhatsApp' },
  { href: '/dry-run', label: 'Dry-run' },
  { href: '/eva-split', label: 'EVA split' },
  { href: '/formulary', label: 'Formulary' },
  { href: '/reports', label: 'Reports' },
  { href: '/status', label: 'System status' },
];

const STAFF_PATHS = [
  '/intake-ops',
  '/claims',
  '/pharmacy',
  '/programs',
  '/refills',
  '/admin',
  '/notifications',
  '/dry-run',
  '/eva-split',
  '/formulary',
  '/reports',
  '/inventory',
  '/ocr',
  '/review',
  '/requests',
  '/safety',
];

export function AppNav() {
  const pathname = usePathname() || '/';
  const onStaff = STAFF_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  const [staffOpen, setStaffOpen] = useState(onStaff);

  function active(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav className="aid-nav sticky top-0 z-40" aria-label="Site">
      <div className="mx-auto max-w-6xl px-3 py-2.5 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/"
            className="mr-1.5 inline-flex items-center gap-2 whitespace-nowrap"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md"
              style={{
                background: 'linear-gradient(135deg, #059669, #0d9488 55%, #6d28d9)',
              }}
              aria-hidden
            >
              M
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900">
              Medical Aid
            </span>
          </Link>
          {PUBLIC.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition whitespace-nowrap min-h-[2.25rem] inline-flex items-center ${
                active(item.href)
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
              }`}
              title={item.labelAr}
            >
              {item.label}
            </Link>
          ))}
          <span className="ml-auto sm:ml-0">
            <GetAppButton variant="nav" />
          </span>
        </div>

        <div className="border-t border-slate-200/70 pt-1.5">
          <button
            type="button"
            onClick={() => setStaffOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-violet-700 hover:bg-violet-50/80"
            aria-expanded={staffOpen}
          >
            <span>{staffOpen ? '▾' : '▸'} Staff tools</span>
            <span className="font-normal normal-case text-violet-500" dir="rtl">
              أدوات التشغيل
            </span>
            {!staffOpen && onStaff && (
              <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] normal-case font-medium text-violet-800">
                You are in ops
              </span>
            )}
          </button>

          {staffOpen && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-1">
              {OPS_PRIMARY.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.hint}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition whitespace-nowrap min-h-[2rem] inline-flex items-center ${
                    active(item.href)
                      ? 'bg-violet-700 text-white shadow-sm shadow-violet-700/30'
                      : 'bg-violet-50/90 text-violet-800 hover:bg-violet-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-full px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-white/80">
                  More ▾
                </summary>
                <div className="absolute left-0 mt-1 w-48 rounded-2xl border border-slate-200 bg-white/95 py-1 shadow-xl backdrop-blur z-50">
                  {OPS_MORE.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 text-xs hover:bg-slate-50 ${
                        active(item.href)
                          ? 'text-violet-700 font-medium'
                          : 'text-slate-700'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </details>
              <StaffAuthChip />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
