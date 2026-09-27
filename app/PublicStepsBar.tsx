import Link from 'next/link';

/** Compact 1 → 2 progress for public beneficiary flow */
export function PublicStepsBar({
  active,
}: {
  active: 'submit' | 'status';
}) {
  const steps = [
    { key: 'submit' as const, n: 1, label: 'Submit', labelAr: 'تقديم', href: '/intake' },
    {
      key: 'status' as const,
      n: 2,
      label: 'Status',
      labelAr: 'حالة',
      href: '/request-status',
    },
  ];

  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-1 sm:gap-2">
          {steps.map((s, i) => {
            const isActive = s.key === active;
            const isDone = active === 'status' && s.key === 'submit';
            return (
              <div key={s.key} className="flex flex-1 items-center gap-1 sm:gap-2">
                {i > 0 && (
                  <div
                    className={`h-0.5 flex-1 rounded ${
                      isDone || isActive ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                  />
                )}
                <Link
                  href={s.href}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20'
                        : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-300 text-white'
                    }`}
                  >
                    {isDone && !isActive ? '✓' : s.n}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.labelAr}</span>
                </Link>
              </div>
            );
          })}
        </div>
        <Link
          href="/guide#for-you"
          className="text-[10px] text-violet-700 hover:underline whitespace-nowrap shrink-0"
        >
          Help?
        </Link>
      </div>
      <p className="mt-2 text-[10px] text-slate-500 text-center" dir="rtl">
        {active === 'submit'
          ? 'الخطوة 1: املأ النموذج واحفظ رقم الطلب'
          : 'الخطوة 2: أدخل رقم الطلب لمعرفة الحالة'}
      </p>
    </div>
  );
}
