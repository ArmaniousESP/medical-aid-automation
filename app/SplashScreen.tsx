'use client';

import { useEffect, useState } from 'react';
import { BrandMark } from './BrandMark';

/**
 * Brief branded splash on first load (browser + installed PWA).
 * Respects prefers-reduced-motion.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hold = motion ? 200 : 900;
    const fadeMs = motion ? 150 : 350;

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
      <BrandMark size="lg" dark />
    </div>
  );
}
