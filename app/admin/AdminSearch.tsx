'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type AdminLink = {
  href: string;
  label: string;
  labelAr?: string;
  hint: string;
  group: string;
};

const LINKS: AdminLink[] = [
  { href: '/intake-ops', label: '1 Queue', labelAr: 'الطابور', hint: 'Process intake · search rows', group: 'Path' },
  { href: '/claims', label: '2 Claims', labelAr: 'المطالبات', hint: 'Submit drafts', group: 'Path' },
  { href: '/pharmacy', label: '3 Pharmacy', labelAr: 'الصيدلية', hint: 'EVA CSV · search patients', group: 'Path' },
  { href: '/programs', label: '4 Programs', labelAr: 'البرامج', hint: 'Chronic enrollments', group: 'Path' },
  { href: '/refills', label: '5 Refills', labelAr: 'إعادة الصرف', hint: 'Monthly cycles', group: 'Path' },
  { href: '/admin/roles', label: 'Roles', labelAr: 'الأدوار', hint: 'admin · operator · viewer', group: 'Admin' },
  { href: '/notifications', label: 'WhatsApp', labelAr: 'واتساب', hint: 'Alerts & dry-run', group: 'Ops' },
  { href: '/dry-run', label: 'Dry-run', hint: 'WhatsApp test mode', group: 'Ops' },
  { href: '/eva-split', label: 'EVA split', hint: 'Available vs not EVA', group: 'Ops' },
  { href: '/formulary', label: 'Formulary', labelAr: 'القائمة الدوائية', hint: 'Catalog search & sync', group: 'Ops' },
  { href: '/inventory', label: 'Inventory', labelAr: 'المخزون', hint: 'Stock · receive · CSV', group: 'Ops' },
  { href: '/ocr', label: 'OCR', labelAr: 'مسح الروشتة', hint: 'Prescriptions & invoices', group: 'Ops' },
  { href: '/documents', label: 'Documents', labelAr: 'المستندات', hint: 'Register Drive files', group: 'Ops' },
  { href: '/ddinter', label: 'DDInter', labelAr: 'تفاعلات دوائية', hint: 'Drug interaction check', group: 'Ops' },
  { href: '/combinations', label: 'Combinations', hint: 'Observed med combos', group: 'Ops' },
  { href: '/care-line', label: 'Care line', hint: 'Patient support notes', group: 'Ops' },
  { href: '/analytics', label: 'Analytics', labelAr: 'تحليلات', hint: 'Enrollment & cost trends', group: 'Ops' },
  { href: '/reports', label: 'Reports', labelAr: 'التقارير', hint: 'Costs & analytics', group: 'Ops' },
  { href: '/review', label: 'Review', hint: 'Manual review queue', group: 'Ops' },
  { href: '/requests', label: 'Requests', hint: 'Aid requests list', group: 'Ops' },
  { href: '/refills/safety', label: 'Safety queue', hint: 'DDInter / allergy flags', group: 'Ops' },
  { href: '/status', label: 'System status', hint: 'Health checks', group: 'System' },
  { href: '/guide#for-staff', label: 'Staff guide', labelAr: 'دليل التشغيل', hint: 'How to use ops', group: 'System' },
  { href: '/sign-in', label: 'Sign in', labelAr: 'تسجيل الدخول', hint: 'Neon Google Auth', group: 'System' },
  { href: '/', label: 'Home', labelAr: 'الرئيسية', hint: 'Public home', group: 'System' },
];

function match(link: AdminLink, q: string): boolean {
  if (!q) return true;
  const hay = [link.label, link.labelAr, link.hint, link.group, link.href]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

export function AdminSearch() {
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => LINKS.filter((l) => match(l, q.trim())),
    [q]
  );

  const byGroup = useMemo(() => {
    const map = new Map<string, AdminLink[]>();
    for (const l of filtered) {
      if (!map.has(l.group)) map.set(l.group, []);
      map.get(l.group)!.push(l);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-white p-3 shadow-sm space-y-2">
        <label htmlFor="admin-search" className="text-sm font-semibold text-slate-800">
          Search tools · بحث في الأدوات
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            ⌕
          </span>
          <input
            id="admin-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pharmacy, OCR, DDInter, inventory…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            autoComplete="off"
            dir="auto"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          {filtered.length} of {LINKS.length} tools
          {q ? <span className="text-violet-800 font-medium"> · “{q}”</span> : null}
        </p>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">
          <p>No tools match “{q}”.</p>
          <button
            type="button"
            onClick={() => setQ('')}
            className="mt-2 text-violet-700 font-medium underline"
          >
            Clear search
          </button>
        </div>
      )}

      {byGroup.map(([group, items]) => (
        <section key={group} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-1">
            {group}
          </h3>
          <div className="grid gap-2">
            {items.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm hover:border-violet-300 hover:bg-violet-50/50 transition"
              >
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-900">{s.label}</span>
                  <span className="text-xs text-slate-500">
                    {s.hint}
                    {s.labelAr ? ` · ${s.labelAr}` : ''}
                  </span>
                </span>
                <span className="text-slate-300 shrink-0">→</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
