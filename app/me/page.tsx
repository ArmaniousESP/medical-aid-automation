'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SearchablePicker } from '@/components/SearchablePicker';
import { COMPANY_OPTIONS } from '@/lib/optionLists';
import { loadProfile, saveProfile } from '@/lib/intakeDraft';

type RequestSummary = {
  id: string;
  status: string;
  patient_name: string | null;
  created_at: string;
  med_count: number;
  has_staff_note: boolean;
  open_inquiry: boolean;
};

type Profile = {
  emp_name: string;
  emp_id: string;
  company: string;
  phone_masked: string;
  city: string | null;
  request_count: number;
  requests: RequestSummary[];
};

type PriorMed = { name: string; qty: number; eva?: string };
type PriorRegimen = {
  id: string;
  patient_name: string;
  support_year: number;
  meds: PriorMed[];
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

const field = 'aid-input';

function statusBadge(s: string) {
  const x = s.toLowerCase();
  if (x === 'submitted') return 'aid-badge-warn';
  if (x === 'triage') return 'inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-900 ring-1 ring-violet-100';
  if (x === 'enrolled' || x === 'approved') return 'aid-badge-success';
  if (x === 'rejected') return 'inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-red-100';
  if (x === 'dispensed') return 'aid-badge-info';
  return 'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700';
}

function statusLabel(s: string): { ar: string; en: string } {
  const x = s.toLowerCase();
  if (x === 'submitted') return { ar: 'تم الاستلام', en: 'Received' };
  if (x === 'triage') return { ar: 'قيد المراجعة', en: 'Under review' };
  if (x === 'approved') return { ar: 'معتمد', en: 'Approved' };
  if (x === 'enrolled') return { ar: 'مسجّل', en: 'Enrolled' };
  if (x === 'dispensed') return { ar: 'تم الصرف', en: 'Dispensed' };
  if (x === 'rejected') return { ar: 'مرفوض', en: 'Rejected' };
  if (x === 'cancelled') return { ar: 'ملغى', en: 'Cancelled' };
  return { ar: s, en: s };
}

function buildRenewHref(
  company: string,
  empId: string,
  phone: string,
  empName: string,
  reg: PriorRegimen
) {
  const meds = reg.meds.map((m) => `${m.name}|${m.qty || 1}`).join(';');
  const q = new URLSearchParams({
    company,
    emp_id: empId,
    phone,
    emp_name: empName,
    patient: reg.patient_name,
    renew: '2027',
    regimen_id: reg.id,
    meds,
  });
  return `/intake?${q.toString()}`;
}

function stashRenewPrefill(
  company: string,
  empId: string,
  phone: string,
  empName: string,
  reg: PriorRegimen
) {
  try {
    sessionStorage.setItem(
      'maa_renew_prefill',
      JSON.stringify({
        company,
        emp_id: empId,
        phone,
        emp_name: empName,
        patient_name: reg.patient_name,
        regimen_id: reg.id,
        meds: reg.meds.map((m) => ({ name: m.name, qty: m.qty || 1 })),
        comments: 'Renewal for 2027 chronic medicine support · تجديد دعم 2027',
        hint: '2027 renewal — form pre-filled from last year. Review medicines, update if needed, then submit.',
        relation:
          reg.patient_name.replace(/\s+/g, '') === empName.replace(/\s+/g, '')
            ? 'self'
            : 'dependent',
      })
    );
  } catch {
    /* ignore quota */
  }
}

function formatDeadline(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

export default function EmployeePortalPage() {
  const [company, setCompany] = useState('');
  const [empId, setEmpId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [regimens, setRegimens] = useState<PriorRegimen[]>([]);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [deadline, setDeadline] = useState('2026-12-10');
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
      await lookup();
      setActiveId(activeId);
    } catch (err: unknown) {
      setReplyMsg(err instanceof Error ? err.message : 'Error');
    } finally {
      setReplyBusy(false);
    }
  }

  const newRequestHref = `/intake?company=${encodeURIComponent(company)}&emp_id=${encodeURIComponent(empId)}&phone=${encodeURIComponent(phone)}`;

  return (
    <main className="min-h-screen p-4 sm:p-6 text-slate-900 pb-24">
      <div className="mx-auto max-w-md space-y-5">
        <header className="space-y-2 text-center aid-rise">
          <p className="aid-section-label">For employees · للموظفين</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My profile</h1>
          <p className="text-sm text-slate-600" dir="rtl">
            ملفك · تجديد دعم 2027 · طلباتك
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Company + employee ID + phone · renew regimens · past requests · reply to staff.
          </p>
        </header>

        <form
          onSubmit={lookup}
          className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm space-y-4 backdrop-blur"
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Company · الشركة</span>
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
            <span className="text-sm font-medium text-slate-700">Employee ID · الرقم الوظيفي</span>
            <input
              required
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className={field + ' font-mono'}
              placeholder="e.g. 739"
              inputMode="numeric"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Phone · الهاتف</span>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={field}
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
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
            <p className="font-semibold">Could not open profile</p>
            <p className="text-xs">{error}</p>
            <Link href="/intake" className="inline-block text-emerald-800 font-semibold text-xs">
              Submit a first request →
            </Link>
          </div>
        )}

        {profile && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-emerald-200/80 bg-white/95 p-5 shadow-sm space-y-3 backdrop-blur">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Employee</p>
                <p className="text-xl font-bold text-slate-900">{profile.emp_name}</p>
                <p className="text-sm text-slate-600">
                  {profile.company} · ID {profile.emp_id}
                </p>
                <p className="text-xs text-slate-400 mt-1">Phone {profile.phone_masked}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href={newRequestHref} className="aid-cta-primary py-3 text-center text-sm">
                  New request
                </Link>
                <Link
                  href="/request-status"
                  className="rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-800"
                >
                  Status by ID
                </Link>
              </div>
            </div>

            <section
              className={`rounded-2xl border p-5 space-y-3 shadow-sm ${
                deadlinePassed
                  ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50'
                  : 'border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {deadlinePassed ? '⏰' : '💚'}
                </span>
                <div className="space-y-1 min-w-0">
                  <h2 className="font-bold text-slate-900">Renew for 2027 · تجديد دعم 2027</h2>
                  <p className="text-sm text-slate-700">
                    Confirm or update your regimen for next year — continuity with low friction.
                  </p>
                  <p className="text-sm text-slate-600" dir="rtl">
                    لاستمرار صرف الأدوية المزمنة في 2027، أكّد أو حدّث نفس العلاج قبل الموعد.
                  </p>
                  <p className="text-xs text-slate-500 pt-1">
                    Target: <strong>{formatDeadline(deadline)}</strong>
                    {deadlinePassed
                      ? ' — late renewals still accepted.'
                      : ' — renew by then to continue without interruption.'}
                  </p>
                </div>
              </div>

              {regimens.length === 0 ? (
                <div className="rounded-xl bg-white/80 border border-white p-3 text-sm text-slate-600 space-y-2">
                  <p>No 2026 regimen on file for this profile yet.</p>
                  <Link href={newRequestHref} className="inline-block text-emerald-800 font-semibold text-xs">
                    Start a 2027 request →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Your 2026 support · دعم 2026 ({regimens.length})
                  </p>
                  {regimens.map((reg) => (
                    <article
                      key={reg.id}
                      className="rounded-xl bg-white/90 border border-white p-4 space-y-3 shadow-sm"
                    >
                      <div className="flex justify-between gap-2 items-start">
                        <div>
                          <p className="font-semibold text-slate-900">{reg.patient_name}</p>
                          <p className="text-[11px] text-slate-400">
                            {reg.meds.length} medicine{reg.meds.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            reg.renewal_status === 'renewed_2027'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {reg.renewal_status === 'renewed_2027' ? 'Renewed 2027' : 'Needs 2027 renew'}
                        </span>
                      </div>
                      <ul className="text-xs text-slate-700 space-y-1 max-h-40 overflow-y-auto">
                        {reg.meds.map((m, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-slate-400 shrink-0">{m.qty || 1}×</span>
                            <span className="min-w-0 break-words">{m.name}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={buildRenewHref(company, empId, phone, profile.emp_name, reg)}
                        onClick={() =>
                          stashRenewPrefill(company, empId, phone, profile.emp_name, reg)
                        }
                        className="aid-cta-violet block w-full py-2.5 text-center text-sm font-semibold"
                      >
                        Renew this for 2027 · تجديد هذا للعلاج
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {profile.requests.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800">
                  Your requests · طلباتك ({profile.requests.length})
                </p>
                {profile.requests.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm space-y-3 backdrop-blur"
                  >
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.patient_name || 'Patient'}</p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(r.created_at).toLocaleString()} · {r.med_count} med
                          {r.med_count === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-block ${statusBadge(r.status)}`}>
                          {statusLabel(r.status).en}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5" dir="rtl">
                          {statusLabel(r.status).ar}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/request-status?id=${encodeURIComponent(r.id)}&phone=${encodeURIComponent(phone)}&emp_id=${encodeURIComponent(empId)}`}
                        className="text-xs font-semibold text-emerald-800 underline"
                      >
                        View status
                      </Link>
                      <button
                        type="button"
                        onClick={() => openThread(r.id)}
                        className="text-xs font-semibold text-violet-800 underline"
                      >
                        {r.open_inquiry ? 'Reply to staff' : 'Messages'}
                      </button>
                    </div>
                    {activeId === r.id && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                        <ul className="max-h-40 overflow-y-auto space-y-2 text-xs">
                          {messages.map((m) => (
                            <li key={m.id} className="rounded-lg bg-white p-2 border border-slate-100">
                              <p className="text-slate-500">
                                {m.author_label || m.author_role} ·{' '}
                                {new Date(m.created_at).toLocaleString()}
                              </p>
                              <p className="text-slate-800 mt-0.5 whitespace-pre-wrap">{m.body}</p>
                            </li>
                          ))}
                          {!messages.length && (
                            <li className="text-slate-400">No messages yet</li>
                          )}
                        </ul>
                        <textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          className={field + ' text-sm'}
                          rows={2}
                          placeholder="Reply to staff…"
                        />
                        <button
                          type="button"
                          disabled={replyBusy || !reply.trim()}
                          onClick={sendReply}
                          className="aid-cta-primary px-3 py-2 text-xs disabled:opacity-50"
                        >
                          {replyBusy ? 'Sending…' : 'Send reply'}
                        </button>
                        {replyMsg && <p className="text-xs text-slate-600">{replyMsg}</p>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}

            {!profile.requests.length && (
              <p className="text-sm text-slate-500 text-center">No platform requests yet for this profile.</p>
            )}
          </div>
        )}

        <p className="text-center text-xs text-slate-400">
          <Link href="/" className="hover:underline">
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
