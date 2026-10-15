'use client';

import { useCallback, useEffect, useState } from 'react';

export type DryRunStatus = {
  env_forces?: boolean;
  cookie_on?: boolean;
  cookie_present?: boolean;
  effective?: boolean;
  can_toggle_off?: boolean;
};

/**
 * Shared dry-run preference for WhatsApp ops buttons.
 * Defaults to ON (safe) until the API responds.
 * Setting the value updates the session cookie so all buttons stay in sync.
 */
export function useDryRunMode() {
  const [status, setStatus] = useState<DryRunStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/dry-run-mode', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load dry-run mode');
      setStatus(data);
      setError(null);
      return data as DryRunStatus;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dryRun = status == null ? true : !!status.effective;
  const locked = !!status?.env_forces;

  async function setDryRun(enabled: boolean) {
    if (!enabled && locked) {
      setError('WHATSAPP_DRY_RUN=1 forces dry-run on the server');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ops/dry-run-mode', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set dry-run');
      setStatus(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  return {
    dryRun,
    locked,
    loading,
    error,
    status,
    refresh,
    setDryRun,
  };
}
