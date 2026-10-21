'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { UnlockPanel } from '../UnlockPanel';

type Flags = {
  who_assessment?: { enabled?: boolean };
  ai_adherence_coach?: { enabled?: boolean };
};

/**
 * Staff unlock + clear auth readiness (Google vs PROCESS_SECRET).
 */
export function AdminPanelClient({
  neonConfigured = false,
  allowlistCount = 0,
  flags,
}: {
  neonConfigured?: boolean;
  allowlistCount?: number;
  flags?: Flags;
}) {
  const googleReady = neonConfigured && allowlistCount > 0;

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border p-4 text-sm space-y-2 shadow-sm"
        style={{
          background: 'var(--aid-surface)',
          borderColor: 'var(--aid-line)',
          color: 'var(--aid-ink)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--aid-muted)' }}>
          Access · الوصول
        </p>
        <ul className="space-y-1.5 text-xs leading-relaxed" style={{ color: 'var(--aid-muted)' }}>
          <li>
            <span className="font-semibold" style={{ color: 'var(--aid-ink)' }}>
              Google staff:
            </span>{' '}
            {googleReady
              ? `ready · ${allowlistCount} email(s) on allowlist`
              : neonConfigured
                ? 'Neon Auth on — set OPS_ALLOWED_EMAILS'
                : 'not configured · see docs/NEON_AUTH.md'}
          </li>
          <li>
            <span className="font-semibold" style={{ color: 'var(--aid-ink)' }}>
              PROCESS_SECRET:
            </span>{' '}
            unlock on Home or below (emergency / shared ops)
          </li>
          {flags?.who_assessment && (
            <li>
              WHO assessment:{' '}
              {flags.who_assessment.enabled ? 'ON' : 'off until management approval'}
            </li>
          )}
          {flags?.ai_adherence_coach && (
            <li>
              AI adherence coach:{' '}
              {flags.ai_adherence_coach.enabled ? 'ON' : 'off until management approval'}
            </li>
          )}
        </ul>
        {!googleReady && (
          <p className="text-xs pt-1">
            <Link href="/sign-in" className="font-semibold underline" style={{ color: 'var(--aid-emerald)' }}>
              Open staff sign-in
            </Link>
            {' · '}
            <a
              href="https://github.com/medshub/medical-aid-automation/blob/main/docs/NEON_AUTH.md"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              Setup guide
            </a>
          </p>
        )}
      </div>

      <Suspense fallback={null}>
        <UnlockPanel />
      </Suspense>
    </div>
  );
}
