'use client';

import { useEffect } from 'react';

/** Registers /sw.js once on the client (HTTPS / localhost only). */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const run = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline or blocked — non-fatal */
      });
    };

    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });
  }, []);

  return null;
}
