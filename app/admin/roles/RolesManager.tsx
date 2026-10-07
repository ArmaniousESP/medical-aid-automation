'use client';

import { useCallback, useEffect, useState } from 'react';
import { SearchablePicker } from '@/components/SearchablePicker';
import { STAFF_ROLE_OPTIONS } from '@/lib/optionLists';

type RoleRow = {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  active: boolean;
  notes: string | null;
};

const cred: RequestInit = { credentials: 'include' };

export function RolesManager() {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [actor, setActor] = useState<string | null>(null);
  const [actorRole, setActorRole] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'operator' | 'viewer'>('operator');
  const [displayName, setDisplayName] = useState('');

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch('/api/admin/roles', cred);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRows(data.roles || []);
      setActor(data.actor || null);
      setActorRole(data.actor_role || null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upsert(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/admin/roles', {
        ...cred,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          email,
          role,
          display_name: displayName || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMsg(`Saved ${data.role?.email} as ${data.role?.role}`);
      setEmail('');
      setDisplayName('');
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function syncAllowlist() {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/admin/roles', {
        ...cred,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_allowlist' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setMsg(`Synced allowlist · added ${data.added ?? 0}`);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function remove(emailToRemove: string) {
    if (!confirm(`Remove role for ${emailToRemove}?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roles', {
        ...cred,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', email: emailToRemove }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function setInactive(emailToDeactivate: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roles', {
        ...cred,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate', email: emailToDeactivate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {(actor || actorRole) && (
        <p className="text-xs text-slate-500">
          Signed in as <strong>{actor}</strong>
          {actorRole ? ` · role=${actorRole}` : ''}
        </p>
      )}

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
          <p className="text-xs mt-1">
            Need <strong>admin</strong> role or{' '}
            <code className="bg-white/80 px-1 rounded">OPS_ADMIN_EMAILS</code>. Unlock
            with Google first.
          </p>
        </div>
      )}

      {msg && (
        <p className="text-xs text-emerald-700 font-medium">{msg}</p>
      )}

      <form
        onSubmit={upsert}
        className="rounded-xl border bg-white p-4 shadow-sm space-y-3"
      >
        <p className="text-sm font-medium">Add / update staff</p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@organization.org"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name (optional)"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <SearchablePicker
          value={role}
          onChange={(v) => {
            if (v === 'admin' || v === 'operator' || v === 'viewer') setRole(v);
          }}
          options={STAFF_ROLE_OPTIONS}
          allowCreate={false}
          placeholder="Select role…"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? '…' : 'Save role'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={syncAllowlist}
            className="rounded border border-violet-300 px-3 py-2 text-sm text-violet-900 disabled:opacity-50"
          >
            Sync from OPS_ALLOWED_EMAILS
          </button>
        </div>
      </form>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Active</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-xs text-slate-500">
                  No rows yet — save a role or sync allowlist.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{r.email}</div>
                  {r.display_name && (
                    <div className="text-xs text-slate-500">{r.display_name}</div>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      r.role === 'admin'
                        ? 'bg-violet-100 text-violet-900'
                        : r.role === 'operator'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {r.role}
                  </span>
                </td>
                <td className="p-3 text-xs">{r.active ? 'yes' : 'no'}</td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  {r.active && (
                    <button
                      type="button"
                      className="text-xs text-amber-700 hover:underline"
                      onClick={() => setInactive(r.email)}
                    >
                      Deactivate
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => remove(r.email)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
