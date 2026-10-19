'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SearchablePicker } from '@/components/SearchablePicker';
import { COMPANY_OPTIONS } from '@/lib/optionLists';
import { loadProfile, saveProfile } from '@/lib/intakeDraft';
import { PublicStepsBar } from '../PublicStepsBar';

type Profile = {
  emp_name: string;
  emp_id: string;
  company: string;
  phone_masked: string;
  city: string | null;
  request_count: number;
  requests: Array<{
    id: string;
    status: string;
    patient_name: string | null;
    created_at: string;
    med_count: number;
    has_staff_note: boolean;
    open_inquiry: boolean;
  }>;
};

type PriorRegimen = {
  id: string;
  patient_name: string;
  support_year: number;
  meds: Array<{ name: string; qty: number }>;
  renewal_status: string;
  last_update: string | null;
};

type Msg = {
  id: string;
  author_role: string;
  author_label: string | null;
  body: string;
  created_at: string;
};

export default function EmployeePortalClient() {
  const [company, setCompany] = useState('');
  const [empId, setEmpId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [regimens, setRegimens] = useState<PriorRegimen[]>([]);
  const [deadline, setDeadline] = useState('2026-12-10');
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyMsg, setReplyMsg] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (p) {
      setCompany(p.company || '');
      setEmpId(p.emp_id || '');
      setPhone(p.phone || '');
    }
  }, []);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setProfile(null);
    setRegimens([]);
    setActiveId(null);
    setMessages([]);
    try {
      const res = await fetch('/api/employee/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, emp_id: empId, phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Not found');
      setProfile(data.profile);
      saveProfile({
        emp_name: data.profile.emp_name,
        emp_id: empId.trim(),
        company: company.trim(),
        phone: phone.trim(),
        city: data.profile.city || '',
      });
      const rr = await fetch('/api/employee/regimens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, emp_id: empId, phone }),
      });
      const rd = await rr.json();
      if (rd.ok) {
        setRegimens(rd.regimens || []);
        setDeadlinePassed(!!rd.deadline_passed);
        if (rd.deadline) setDeadline(rd.deadline);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function openThread(requestId: string) {
    setActiveId(requestId);
    setReplyMsg(null);
    try {
      const q = new URLSearchParams({
        request_id: requestId,
        company,
        emp_id: empId,
        phone,
      });
      const res = await fetch(`/api/employee/reply?${q}`);
      const data = await res.json();
      if (data.ok) setMessages(data.messages || []);
      else setMessages([]);
    } catch {
      setMessages([]);
    }
  }

  async function sendReply() {
    if (!activeId || !reply.trim()) return;
    setReplyBusy(true);
    setReplyMsg(null);
    try {
      const res = await fetch('/api/employee/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: activeId,
          company,
          emp_id: empId,
          phone,
          body: reply.trim(),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed');
      setMessages(data.messages || []);
      setReply('');
      setReplyMsg('Reply sent · تم الإرسال');
    } catch (err: unknown) {
      setReplyMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setReplyBusy(false);
    }
  }

  const newRequestHref = `/intake?company=${encodeURIComponent(company)}&emp_id=${encodeURIComponent(empId)}&phone=${encodeURIComponent(phone)}`;

  return (
    <main className="min-h-screen p-4 sm:p-6 pb-24" style={{ color: 'var(--aid-ink)' }}>
      <div className="mx-auto max-w-md space-y-5">
        <PublicStepsBar active="profile" />
        <header className="space-y-2 text-center aid-rise">
          <p className="aid-section-label">For employees · للموظفين</p>
          <h1 className="aid-display text-3xl sm:text-4xl font-semibold tracking-tight">My profile</h1>
          <p className="text-sm" style={{ color: 'var(--aid-muted)' }} dir="rtl">
            ملفك · تجديد دعم 2027 · طلباتك
          </p>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--aid-muted)' }}>
            No password — company, employee ID, and phone open your history, renewals, and staff replies.
          </p>
        </header>

        {!profile && (
          <div
            className="rounded-2xl border p-4 text-xs leading-relaxed shadow-sm"
            style={{
              background: 'var(--aid-surface)',
              borderColor: 'var(--aid-line)',
              color: 'var(--aid-muted)',
            }}
          >
            <p className="font-semibold mb-1" style={{ color: 'var(--aid-ink)' }}>
              How your data stays private
            </p>
            We only show records that match all three fields. Staff use Google sign-in; this page never
            lists other employees.
          </div>
        )}

        <form
          onSubmit={lookup}
          className="rounded-2xl border p-5 shadow-sm space-y-4"
          style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Company · الشركة</span>
            <SearchablePicker
              value={company}
              onChange={setCompany}
              options={COMPANY_OPTIONS}
              learnKey="company"
              allowCreate
              placeholder="Search company…"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Employee ID · الرقم الوظيفي</span>
            <input
              required
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="aid-input font-mono"
              placeholder="e.g. 739"
              inputMode="numeric"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Phone · الهاتف</span>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="aid-input"
              placeholder="Same phone on file"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="aid-cta-primary w-full py-3.5 text-base disabled:opacity-50"
          >
            {loading ? 'Opening… · جاري الفتح' : 'Open my profile · فتح الملف'}
          </button>
        </form>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm space-y-2">
            <p className="font-semibold">Could not open profile</p>
            <p className="text-xs">{error}</p>
            <Link href="/intake" className="inline-block text-xs font-semibold" style={{ color: 'var(--aid-emerald)' }}>
              Submit a first request →
            </Link>
          </div>
        )}

        {profile && (
          <div className="space-y-4">
            <div
              className="rounded-2xl border-2 p-5 shadow-sm space-y-3"
              style={{
                borderColor: 'color-mix(in srgb, var(--aid-emerald) 35%, white)',
                background: 'var(--aid-surface)',
              }}
            >
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--aid-muted)' }}>
                  Employee
                </p>
                <p className="text-xl font-bold">{profile.emp_name}</p>
                <p className="text-sm" style={{ color: 'var(--aid-muted)' }}>
                  {profile.company} · ID {profile.emp_id}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--aid-muted)' }}>
                  Phone {profile.phone_masked}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href={newRequestHref} className="aid-cta-primary py-3 text-center text-sm">
                  New request
                </Link>
                <Link
                  href="/request-status"
                  className="rounded-xl border py-3 text-center text-sm font-semibold"
                  style={{ borderColor: 'var(--aid-line)', background: 'var(--aid-paper)' }}
                >
                  Status by ID
                </Link>
              </div>
            </div>

            <section
              className="rounded-2xl border p-5 space-y-3 shadow-sm"
              style={{
                borderColor: deadlinePassed ? '#fcd34d' : 'var(--aid-line)',
                background: deadlinePassed ? '#fffbeb' : 'var(--aid-surface)',
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: deadlinePassed ? '#b45309' : 'var(--aid-emerald)' }}
                  aria-hidden
                >
                  27
                </span>
                <div className="space-y-1 min-w-0">
                  <h2 className="aid-display text-xl font-semibold">Renew for 2027 · تجديد دعم 2027</h2>
                  <p className="text-sm" style={{ color: 'var(--aid-muted)' }}>
                    Confirm or update your regimen for next year.
                  </p>
                  <p className="text-xs" style={{ color: 'var(--aid-muted)' }}>
                    Target: <strong>{deadline}</strong>
                    {deadlinePassed
                      ? ' — late renewals still accepted.'
                      : ' — renew by then to continue without interruption.'}
                  </p>
                </div>
              </div>
              {regimens.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--aid-muted)' }}>
                  No 2026 regimen on file yet.{' '}
                  <Link href={newRequestHref} className="font-semibold underline" style={{ color: 'var(--aid-emerald)' }}>
                    Start a 2027 request
                  </Link>
                </p>
              ) : (
                <ul className="space-y-3">
                  {regimens.map((reg) => (
                    <li
                      key={reg.id}
                      className="rounded-xl border p-4 space-y-2"
                      style={{ borderColor: 'var(--aid-line)', background: 'var(--aid-paper)' }}
                    >
                      <p className="font-semibold">{reg.patient_name}</p>
                      <p className="text-xs" style={{ color: 'var(--aid-muted)' }}>
                        {reg.meds.length} medicine{reg.meds.length === 1 ? '' : 's'} · {reg.renewal_status}
                      </p>
                      <Link
                        href={`/intake?company=${encodeURIComponent(company)}&emp_id=${encodeURIComponent(empId)}&phone=${encodeURIComponent(phone)}&patient=${encodeURIComponent(reg.patient_name)}&renew=2027&regimen_id=${encodeURIComponent(reg.id)}`}
                        className="aid-cta-primary block w-full py-2.5 text-center text-sm"
                      >
                        Renew this for 2027 · تجديد هذا للعلاج
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {profile.requests.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Your requests · طلباتك ({profile.requests.length})</p>
                {profile.requests.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-2xl border p-4 shadow-sm space-y-2"
                    style={{ borderColor: 'var(--aid-line)', background: 'var(--aid-surface)' }}
                  >
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-medium">{r.patient_name || 'Patient'}</p>
                        <p className="text-[11px]" style={{ color: 'var(--aid-muted)' }}>
                          {new Date(r.created_at).toLocaleString()} · {r.med_count} meds
                        </p>
                      </div>
                      <span className="aid-badge-info">{r.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/request-status?id=${encodeURIComponent(r.id)}&phone=${encodeURIComponent(phone)}&emp_id=${encodeURIComponent(empId)}`}
                        className="text-xs font-semibold underline"
                        style={{ color: 'var(--aid-emerald)' }}
                      >
                        View status
                      </Link>
                      <button
                        type="button"
                        onClick={() => openThread(r.id)}
                        className="text-xs font-semibold underline"
                        style={{ color: 'var(--aid-ink)' }}
                      >
                        {r.open_inquiry ? 'Reply to staff' : 'Messages'}
                      </button>
                    </div>
                    {activeId === r.id && (
                      <div
                        className="rounded-xl border p-3 space-y-2"
                        style={{ borderColor: 'var(--aid-line)', background: 'var(--aid-paper)' }}
                      >
                        <ul className="max-h-36 overflow-y-auto space-y-2 text-xs">
                          {messages.length === 0 && (
                            <li style={{ color: 'var(--aid-muted)' }}>No messages yet</li>
                          )}
                          {messages.map((m) => (
                            <li
                              key={m.id}
                              className="rounded-lg border p-2"
                              style={{ borderColor: 'var(--aid-line)', background: 'var(--aid-surface)' }}
                            >
                              <p style={{ color: 'var(--aid-muted)' }}>
                                {m.author_label || m.author_role} ·{' '}
                                {new Date(m.created_at).toLocaleString()}
                              </p>
                              <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                            </li>
                          ))}
                        </ul>
                        <textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          className="aid-input text-sm min-h-[72px]"
                          placeholder="Write a reply to staff…"
                        />
                        <button
                          type="button"
                          disabled={replyBusy || !reply.trim()}
                          onClick={() => void sendReply()}
                          className="aid-cta-primary w-full py-2 text-sm disabled:opacity-50"
                        >
                          {replyBusy ? 'Sending…' : 'Send reply · إرسال'}
                        </button>
                        {replyMsg && (
                          <p className="text-xs" style={{ color: 'var(--aid-muted)' }}>
                            {replyMsg}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-sm pt-2" style={{ color: 'var(--aid-muted)' }}>
          <Link href="/" className="hover:underline font-medium" style={{ color: 'var(--aid-emerald)' }}>
            Home
          </Link>
          {' · '}
          <Link href="/guide" className="hover:underline">
            Guide
          </Link>
        </p>
      </div>
    </main>
  );
}
