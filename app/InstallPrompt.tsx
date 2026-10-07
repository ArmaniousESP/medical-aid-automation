'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Shows a compact banner when the browser can install the PWA,
 * or a short iOS tip (Share → Add to Home Screen).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (localStorage.getItem('maa_install_dismissed') === '1') return;
    } catch {
      /* ignore */
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) {
      setShowIos(true);
      setHidden(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  function dismiss() {
    setHidden(true);
    setDeferred(null);
    setShowIos(false);
    try {
      localStorage.setItem('maa_install_dismissed', '1');
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setHidden(true);
  }

  if (hidden) return null;
  if (!deferred && !showIos) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-4 inset-x-3 z-[60] mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-3 shadow-lg"
      role="dialog"
      aria-label="Install app"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white text-lg font-bold">
          +
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-slate-900">Install Medical Aid</p>
          {deferred ? (
            <p className="text-xs text-slate-600 mt-0.5">
              Add to your home screen for quick access.
            </p>
          ) : (
            <p className="text-xs text-slate-600 mt-0.5" dir="rtl">
              على iPhone: مشاركة → إضافة إلى الشاشة الرئيسية
              <span className="block mt-0.5 text-left" dir="ltr">
                iPhone: Share → Add to Home Screen
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none px-1"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      {deferred && (
        <button
          type="button"
          onClick={install}
          className="mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Install · تثبيت
        </button>
      )}
    </div>
  );
}
