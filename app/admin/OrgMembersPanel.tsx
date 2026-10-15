'use client';

import { useCallback, useEffect, useState } from 'react';

type Member = {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  active: boolean;
  org_code: string;
};

export function OrgMembersPanel() {
  const [orgCode, setOrgCode] = useState('ARMANIOUS');
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('org_operator');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgCode.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/org-members?org_code=${encodeURIComponent(orgCode.trim())}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMembers(data.members || []);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [orgCode]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/org-members', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_code: orgCode.trim(),
          email: email.trim(),
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'Invite failed');
      }
      setMsg(`Invited ${email}`);
      setEmail('');
      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    setLoading(true);
    try {
      await fetch('/api/admin/org-members', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: active ? 'activate' : 'deactivate',
          id,
        }),
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/70 to-white p-4 shadow-sm space-y-3">
      <div>
        <h2 className="font-semibold text-slate-900">Org members</h2>
        <p className="text-xs text-slate-500">
          Invite staff by Google email · دعوة مشغّلي المؤسسة
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={orgCode}
          onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
          placeholder="ORG CODE"
          className="w-36 rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono uppercase"
        />
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
        >
          Load
        </button>
      </div>

      <form onSubmit={invite} className="space-y-2 rounded-xl border border-white bg-white/90 p-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
          >
            <option value="org_admin">org_admin</option>
            <option value="org_operator">org_operator</option>
            <option value="org_viewer">org_viewer</option>
          </select>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="rounded-xl bg-sky-700 text-white px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            Invite
          </button>
        </div>
      </form>

      {msg && (
        <p className="text-xs text-slate-700 bg-white/80 rounded-lg px-2 py-1.5 border border-slate-100">
          {msg}
        </p>
      )}

      <ul className="divide-y divide-slate-100 text-xs max-h-48 overflow-y-auto">
        {members.map((m) => (
          <li key={m.id} className="py-2 flex flex-wrap items-center gap-2 justify-between">
            <div>
              <div className="font-medium text-slate-800">{m.email}</div>
              <div className="text-slate-500">
                {m.role}
                {!m.active && <span className="text-amber-700"> · inactive</span>}
              </div>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => toggle(m.id, !m.active)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold"
            >
              {m.active ? 'Deactivate' : 'Activate'}
            </button>
          </li>
        ))}
        {!members.length && !loading && (
          <li className="py-2 text-slate-400">No members for this org yet.</li>
        )}
      </ul>
    </section>
  );
}
