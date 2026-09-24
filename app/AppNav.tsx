'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PUBLIC = [
  { href: '/', label: 'Home', labelAr: 'الرئيسية' },
  { href: '/intake', label: '1. Submit', labelAr: 'تقديم طلب' },
  { href: '/request-status', label: '2. Status', labelAr: 'حالة الطلب' },
  { href: '/guide', label: 'Guide', labelAr: 'الدليل' },
];

const OPS = [
  { href: '/intake-ops', label: 'Intake queue' },
  { href: '/claims', label: 'Claims' },
  { href: '/programs', label: 'Programs' },
  { href: '/pharmacy', label: 'Pharmacy' },
  { href: '/refills', label: 'Refills' },
  { href: '/requests', label: 'Ops request list' },
  { href: '/ocr', label: 'OCR' },
  { href: '/review', label: 'Review' },
  { href: '/eva-split', label: 'EVA split' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/reports', label: 'Reports' },
  { href: '/safety', label: 'Safety' },
  { href: '/status', label: 'System status' },
];

export function AppNav() {
  const pathname = usePathname() || '/';

  function active(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur shadow-sm">
      <div className="mx-auto max-w-6xl px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/"
            className="mr-2 text-sm font-semibold text-slate-800 whitespace-nowrap"
          >
            Medical Aid
          </Link>
          {PUBLIC.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition whitespace-nowrap ${
                active(item.href)
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title={item.labelAr}
            >
              {item.label}
            </Link>
          ))}
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
              Ops ▾
            </summary>
            <div className="absolute left-0 mt-1 w-52 rounded-lg border bg-white py-1 shadow-lg z-50">
              <p className="px-3 py-1 text-[10px] text-slate-400">
                Unlock on Home first (PROCESS_SECRET)
              </p>
              {OPS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-1.5 text-xs hover:bg-slate-50 ${
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
        </div>
      </div>
    </nav>
  );
}
