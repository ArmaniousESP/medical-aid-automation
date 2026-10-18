import Link from 'next/link';

/** 1 → 2 → 3 progress for beneficiaries */
export function PublicStepsBar({
  active,
}: {
  active: 'submit' | 'status' | 'profile';
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
    {
      key: 'profile' as const,
      n: 3,
      label: 'Profile',
      labelAr: 'ملفي',
      href: '/me',
    },
  ];

  const order = { submit: 0, status: 1, profile: 2 } as const;
  const activeIdx = order[active];

  const hint =
    active === 'submit'
      ? {
          en: 'Step 1 of 3 — fill the form & save your Request ID',
          ar: 'الخطوة 1 من 3 — املأ النموذج واحفظ رقم الطلب',
        }
      : active === 'status'
        ? {
            en: 'Step 2 of 3 — paste your Request ID to see status',
            ar: 'الخطوة 2 من 3 — الصق رقم الطلب لعرض الحالة',
          }
        : {
            en: 'Step 3 of 3 — company + ID · renew · past requests',
            ar: 'الخطوة 3 من 3 — الشركة والرقم · التجديد · الطلبات',
          };

  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-1 sm:gap-1.5 min-w-0">
          {steps.map((s, i) => {
            const isActive = s.key === active;
            const isDone = order[s.key] < activeIdx;
            return (
              <div key={s.key} className="flex flex-1 items-center gap-1 min-w-0">
                {i > 0 && (
                  <div
                    className={`h-1 flex-1 rounded-full min-w-[0.35rem] ${
                      isDone || isActive ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                    aria-hidden
                  />
                )}
                <Link
                  href={s.href}
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex min-h-[2.5rem] items-center gap-1 rounded-full px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : isDone
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-slate-100/90 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-bold shrink-0 ${
                      isActive
                        ? 'bg-white/25'
                        : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-300 text-white'
                    }`}
                  >
                    {isDone && !isActive ? '✓' : s.n}
                  </span>
                  <span className="truncate">
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
        {hint.en}
        <span className="block text-[11px] mt-0.5" dir="rtl">
          {hint.ar}
        </span>
      </p>
    </div>
  );
}
