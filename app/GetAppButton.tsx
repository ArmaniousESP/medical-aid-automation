'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/**
 * Always-visible "Get the app" control.
 */
export function GetAppButton({
  variant = 'primary',
  className = '',
}: {
  variant?: 'primary' | 'outline' | 'nav' | 'tab';
  className?: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setInstalled(isStandalone());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    const onInstalled = () => setInstalled(true);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function onClick() {
    if (installed) {
      setOpen(true);
      return;
    }
    if (deferred) {
      await deferred.prompt();
      try {
        const choice = await deferred.userChoice;
        if (choice.outcome === 'accepted') setInstalled(true);
      } catch {
        /* ignore */
      }
      setDeferred(null);
      return;
    }
    setOpen(true);
  }

  const base =
    variant === 'tab'
      ? 'flex min-h-[3.5rem] min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-slate-500'
      : variant === 'nav'
        ? 'rounded-full border px-2.5 py-1 text-xs font-semibold text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
        : variant === 'outline'
          ? 'w-full rounded-2xl border-2 border-emerald-600 bg-white py-3.5 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-50'
          : 'w-full rounded-2xl bg-slate-900 py-3.5 text-center text-sm font-semibold text-white hover:bg-slate-800';

  const label =
    variant === 'tab'
      ? installed
        ? 'App'
        : 'Get app'
      : installed
        ? 'App installed · التطبيق مثبت'
        : 'Get the app · حمّل التطبيق';

  return (
    <>
      <button type="button" onClick={onClick} className={`${base} ${className}`}>
        {variant === 'tab' ? (
          <>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-800">
              +
            </span>
            <span className="text-[10px] font-semibold leading-tight">{label}</span>
            <span className="text-[9px] leading-none opacity-75" dir="rtl">
              تطبيق
            </span>
          </>
        ) : (
          label
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="get-app-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="get-app-title" className="text-lg font-bold text-slate-900">
              Get Medical Aid on your phone
            </h2>
            <p className="text-sm text-slate-600" dir="rtl">
              ضع التطبيق على الشاشة الرئيسية للوصول السريع
            </p>

            {installed ? (
              <p className="text-sm text-emerald-800 font-medium">
                You already have the app installed.
              </p>
            ) : isIosSafari() ? (
              <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
                <li>
                  Tap <strong>Share</strong> (□↑) at the bottom of Safari
                </li>
                <li>
                  Choose <strong>Add to Home Screen</strong>
                </li>
                <li dir="rtl">
                  ثم اضغط <strong>إضافة</strong>
                </li>
              </ol>
            ) : (
              <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
                <li>Open the browser menu (⋮)</li>
                <li>
                  Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>
                </li>
                <li dir="rtl">أو استخدم زر التثبيت إن ظهر تلقائياً</li>
              </ol>
            )}

            <div className="flex gap-2 pt-1">
              <a
                href="/splash"
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-xl border py-2.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Preview splash
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Done · تم
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
