'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  {
    href: '/',
    label: 'Home',
    labelAr: 'رئيسية',
    icon: '⌂',
  },
  {
    href: '/intake',
    label: 'Submit',
    labelAr: 'تقديم',
    icon: '1',
  },
  {
    href: '/request-status',
    label: 'Status',
    labelAr: 'حالة',
    icon: '2',
  },
  {
    href: '/guide',
    label: 'Help',
    labelAr: 'مساعدة',
    icon: '?',
  },
];

/** Fixed bottom bar — easy thumb reach on phones */
export function MobilePublicNav() {
  const pathname = usePathname() || '/';

  // Hide on deep staff screens to reduce noise
  const staffDeep =
    pathname.startsWith('/intake-ops') ||
    pathname.startsWith('/claims') ||
    pathname.startsWith('/pharmacy') ||
    pathname.startsWith('/programs') ||
    pathname.startsWith('/refills') ||
    pathname.startsWith('/notifications');

  if (staffDeep) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-white/95 backdrop-blur safe-bottom md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {ITEMS.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[3.25rem] min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-center transition ${
                active
                  ? 'text-emerald-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                  active ? 'bg-emerald-100' : 'bg-slate-100'
                }`}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold leading-tight">
                {item.label}
              </span>
              <span className="text-[9px] leading-none opacity-80" dir="rtl">
                {item.labelAr}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
