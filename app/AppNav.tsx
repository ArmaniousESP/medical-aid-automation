'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PRIMARY = [
  { href: '/', label: 'Home', labelAr: 'الرئيسية' },
  { href: '/guide', label: 'How to use', labelAr: 'طريقة الاستخدام' },
  { href: '/intake', label: 'Submit request', labelAr: 'تقديم طلب' },
  { href: '/intake-ops', label: 'Intake queue', labelAr: 'طابور الطلبات' },
  { href: '/claims', label: 'Claims', labelAr: 'المطالبات' },
  { href: '/programs', label: 'Programs', labelAr: 'البرامج' },
  { href: '/pharmacy', label: 'Pharmacy', labelAr: 'الصيدلية' },
  { href: '/refills', label: 'Refills', labelAr: 'الصرف' },
];

const MORE = [
  { href: '/requests', label: 'Request status' },
  { href: '/ocr', label: 'OCR' },
  { href: '/review', label: 'Review queue' },
  { href: '/eva-split', label: 'EVA split' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/reports', label: 'Reports' },
  { href: '/psp', label: 'Patient journey' },
  { href: '/care-line', label: 'Care line' },
  { href: '/safety', label: 'Safety' },
  { href: '/notifications', label: 'WhatsApp' },
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
          {PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition whitespace-nowrap ${
                active(item.href)
                  ? 'bg-violet-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title={item.labelAr}
            >
              {item.label}
            </Link>
          ))}
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
              More ▾
            </summary>
            <div className="absolute left-0 mt-1 w-48 rounded-lg border bg-white py-1 shadow-lg z-50">
              {MORE.map((item) => (
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
