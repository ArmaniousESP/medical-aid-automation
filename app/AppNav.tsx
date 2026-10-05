'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { StaffAuthChip } from './StaffAuthChip';

const PUBLIC = [
  { href: '/', label: 'Home', labelAr: 'الرئيسية' },
  { href: '/intake', label: '1 · Submit', labelAr: 'تقديم' },
  { href: '/request-status', label: '2 · Status', labelAr: 'حالة' },
  { href: '/guide', label: 'Guide', labelAr: 'الدليل' },
  { href: '/sign-in', label: 'Staff', labelAr: 'تشغيل' },
];

const OPS_PRIMARY = [
  { href: '/intake-ops', label: '1 · Queue', hint: 'Process new requests' },
  { href: '/claims', label: '2 · Claims', hint: 'Review drafts' },
  { href: '/pharmacy', label: '3 · Pharmacy', hint: 'EVA / Not Eva pick list' },
  { href: '/programs', label: '4 · Programs', hint: 'Chronic enrollments' },
  { href: '/refills', label: '5 · Refills', hint: 'Monthly cycle' },
];

const OPS_MORE = [
  { href: '/dry-run', label: 'Dry-run script' },
  { href: '/notifications', label: 'Notifications · WhatsApp' },
  { href: '/eva-split', label: 'EVA split' },
  { href: '/formulary', label: 'Formulary' },
  { href: '/reports', label: 'Reports' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/ocr', label: 'OCR' },
  { href: '/review', label: 'Review' },
  { href: '/requests', label: 'Ops request list' },
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
      <div className="mx-auto max-w-6xl px-3 py-2 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/"
            className="mr-1 text-sm font-semibold text-slate-800 whitespace-nowrap"
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
        </div>

        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 pt-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 mr-1">
            Staff path
          </span>
          {OPS_PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.hint}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition whitespace-nowrap ${
                active(item.href)
                  ? 'bg-violet-700 text-white'
                  : 'bg-violet-50 text-violet-800 hover:bg-violet-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-full px-2 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100">
              More ▾
            </summary>
            <div className="absolute left-0 mt-1 w-52 rounded-lg border bg-white py-1 shadow-lg z-50">
              <p className="px-3 py-1 text-[10px] text-slate-400">
                Google or secret unlock first
              </p>
              {OPS_MORE.map((item) => (
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
          <StaffAuthChip />
        </div>
      </div>
    </nav>
  );
}
