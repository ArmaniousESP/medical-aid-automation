'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GetAppButton } from './GetAppButton';

const PUBLIC_ITEMS = [
  { href: '/', label: 'Home', labelAr: 'رئيسية', icon: '⌂' },
  { href: '/intake', label: 'Submit', labelAr: 'تقديم', icon: '1' },
  { href: '/request-status', label: 'Status', labelAr: 'حالة', icon: '2' },
  { href: '/guide', label: 'Help', labelAr: 'مساعدة', icon: '?' },
] as const;

const STAFF_ITEMS = [
  { href: '/intake-ops', label: 'Queue', icon: '1' },
  { href: '/claims', label: 'Claims', icon: '2' },
  { href: '/pharmacy', label: 'Pharmacy', icon: '3' },
  { href: '/programs', label: 'Programs', icon: '4' },
  { href: '/refills', label: 'Refills', icon: '5' },
] as const;

function isStaffPath(pathname: string) {
  return (
    pathname.startsWith('/intake-ops') ||
    pathname.startsWith('/claims') ||
    pathname.startsWith('/pharmacy') ||
    pathname.startsWith('/programs') ||
    pathname.startsWith('/refills') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/eva-split') ||
    pathname.startsWith('/formulary') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/inventory') ||
    pathname.startsWith('/ocr') ||
    pathname.startsWith('/review') ||
    pathname.startsWith('/requests') ||
    pathname.startsWith('/safety') ||
    pathname.startsWith('/dry-run')
  );
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

/**
 * Fixed bottom bar on phones:
 * - Beneficiaries: Home · Submit · Status · Get app · Help
 * - Staff ops: 1–5 path
 */
export function MobilePublicNav() {
  const pathname = usePathname() || '/';
  const staff = isStaffPath(pathname);

  if (staff) {
    return (
      <nav
        className="fixed bottom-0 inset-x-0 z-50 border-t border-violet-100 bg-white/95 backdrop-blur md:hidden"
        aria-label="Staff path"
        style={{
          paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-0.5 pt-1">
          {STAFF_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-center ${
                  active ? 'text-violet-800' : 'text-slate-500'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    active ? 'bg-violet-700 text-white' : 'bg-violet-50 text-violet-800'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-[10px] font-semibold leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-white/95 backdrop-blur md:hidden"
      aria-label="Main"
      style={{
        paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-0.5 pt-1">
        {PUBLIC_ITEMS.slice(0, 3).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[3.5rem] min-w-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-center ${
                active ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold leading-tight">
                {item.label}
              </span>
              <span className="text-[9px] leading-none opacity-75" dir="rtl">
                {item.labelAr}
              </span>
            </Link>
          );
        })}
        <GetAppButton variant="tab" />
        {PUBLIC_ITEMS.slice(3).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[3.5rem] min-w-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-center ${
                active ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold leading-tight">
                {item.label}
              </span>
              <span className="text-[9px] leading-none opacity-75" dir="rtl">
                {item.labelAr}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
