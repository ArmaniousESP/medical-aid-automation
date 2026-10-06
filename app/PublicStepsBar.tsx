import Link from 'next/link';

/** 1 → 2 progress for beneficiaries */
export function PublicStepsBar({
  active,
}: {
  active: 'submit' | 'status';
}) {
  const steps = [
    {
      key: 'submit' as const,
      n: 1,
      label: 'Submit',
      labelAr: 'تقديم',
      href: '/intake',
    },
    {
      key: 'status' as const,
      n: 2,
      label: 'Status',
      labelAr: 'حالة',
      href: '/request-status',
    },
  ];

  return (
    <div className="rounded-2xl border bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-1.5 sm:gap-2">
          {steps.map((s, i) => {
            const isActive = s.key === active;
            const isDone = active === 'status' && s.key === 'submit';
            return (
              <div key={s.key} className="flex flex-1 items-center gap-1.5">
                {i > 0 && (
                  <div
                    className={`h-1 flex-1 rounded-full ${
                      isDone || isActive ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                    aria-hidden
                  />
                )}
                <Link
                  href={s.href}
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex min-h-[2.5rem] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isDone
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      isActive
                        ? 'bg-white/25'
                        : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-300 text-white'
                    }`}
                  >
                    {isDone && !isActive ? '✓' : s.n}
                  </span>
                  <span>
                    <span className="sm:hidden">{s.labelAr}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
        <Link
          href="/guide#for-you"
          className="text-xs font-medium text-violet-700 hover:underline whitespace-nowrap shrink-0 px-1"
        >
          Help
        </Link>
      </div>
      <p className="mt-2.5 text-xs text-slate-500 text-center">
        {active === 'submit' ? (
          <>
            Step 1 of 2 — fill the form & save your Request ID
            <span className="block text-[11px] mt-0.5" dir="rtl">
              الخطوة 1 من 2 — املأ النموذج واحفظ رقم الطلب
            </span>
          </>
        ) : (
          <>
            Step 2 of 2 — paste your Request ID to see status
            <span className="block text-[11px] mt-0.5" dir="rtl">
              الخطوة 2 من 2 — الصق رقم الطلب لعرض الحالة
            </span>
          </>
        )}
      </p>
    </div>
  );
}
