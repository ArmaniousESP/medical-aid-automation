'use client';

import { useEffect, useState } from 'react';

/**
 * Brief branded splash on first load (browser + installed PWA).
 * Respects prefers-reduced-motion.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hold = reduced ? 200 : 900;
    const fadeMs = reduced ? 150 : 350;

    const t1 = window.setTimeout(() => setFade(true), hold);
    const t2 = window.setTimeout(() => setVisible(false), hold + fadeMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="presentation"
      aria-hidden
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-emerald-600 transition-opacity duration-300 ${
        fade ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute h-16 w-5 rounded-md bg-white" />
        <span className="absolute h-5 w-16 rounded-md bg-white" />
      </div>
      <p className="mt-6 text-xl font-bold tracking-tight text-white">Medical Aid</p>
      <p className="mt-1 text-sm text-emerald-100" dir="rtl">
        دعم العلاج الشهري
      </p>
    </div>
  );
}
