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

type Msg = {
  id: string;
  author_role: string;
  author_label: string | null;
  body: string;
  created_at: string;
};

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200';

function statusBadge(s: string) {
  const x = s.toLowerCase();
  if (x === 'submitted') return 'bg-amber-100 text-amber-900';
  if (x === 'enrolled' || x === 'approved') return 'bg-emerald-100 text-emerald-900';
  if (x === 'rejected') return 'bg-red-100 text-red-800';
  if (x === 'dispensed') return 'bg-sky-100 text-sky-900';
  return 'bg-slate-100 text-slate-700';
}

export default function EmployeePortalPage() {
  const [company, setCompany] = useState('');
  const [empId, setEmpId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

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
    setActiveId(null);
    setMessages([]);
    try {
      const res = await fetch('/api/employee/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, emp_id: empId, phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Not found');
      }
      setProfile(data.profile);
      saveProfile({
        emp_name: data.profile.emp_name,
        emp_id: empId.trim(),
        company: company.trim(),
        phone: phone.trim(),
        city: data.profile.city || '',
      });
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
      // refresh profile flags
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
        <header className="space-y-1 text-center sm:text-left">
          <p className="aid-section-label">For employees · للموظفين</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            My profile
          </h1>
          <p className="text-sm text-slate-600" dir="rtl">
            اختر الشركة ورقم الموظف والهاتف لفتح ملفك
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
            <span className="text-sm font-medium text-slate-700">
              Employee ID · الرقم الوظيفي
            </span>
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
            <span className="text-sm font-medium text-slate-700">
              Phone · الهاتف
            </span>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={field}
              placeholder="Same phone used on a previous request"
            />
            <p className="text-[11px] text-slate-400">
              Privacy check · يجب أن يطابق هاتف طلب سابق
            </p>
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
                <p className="text-xs text-slate-400 mt-1">
                  Phone {profile.phone_masked}
                  {profile.city ? ` · ${profile.city}` : ''}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={newRequestHref}
                  className="aid-cta-primary py-3 text-center text-sm"
                >
                  New request
                </Link>
                <Link
                  href="/request-status"
                  className="rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-800"
                >
                  Status by ID
                </Link>
              </div>
              <p className="text-xs text-slate-500 text-center">
                {profile.request_count} request{profile.request_count === 1 ? '' : 's'} on file
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">Your requests</p>
              {profile.requests.map((r) => (
                <article
                  key={r.id}
                  className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm space-y-3 backdrop-blur"
                >
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {r.patient_name || 'Patient'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(r.created_at).toLocaleDateString()} · {r.med_count} med
                        {r.med_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadge(
                        r.status
                      )}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  {r.open_inquiry && (
                    <p className="text-xs font-medium text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5">
                      Reviewer asked a question · يرجى الرد
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/request-status?id=${r.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      Follow up
                    </Link>
                    <Link
                      href={`${newRequestHref}&patient=${encodeURIComponent(
                        r.patient_name || ''
                      )}`}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"
                    >
                      New for same patient
                    </Link>
                    <button
                      type="button"
                      onClick={() => openThread(r.id)}
                      className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {r.open_inquiry ? 'Reply to inquiry' : 'Messages'}
                    </button>
                  </div>

                  {activeId === r.id && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">
                        Conversation
                      </p>
                      {messages.length === 0 && (
                        <p className="text-xs text-slate-400">No messages yet</p>
                      )}
                      {messages.map((m) => (
                        <div
                          key={m.id}
                          className={`rounded-lg px-3 py-2 text-xs ${
                            m.author_role === 'staff'
                              ? 'bg-violet-50 text-violet-950 border border-violet-100'
                              : 'bg-white border border-slate-100 text-slate-800'
                          }`}
                        >
                          <p className="font-semibold mb-0.5">
                            {m.author_role === 'staff'
                              ? m.author_label || 'Reviewer'
                              : 'You'}
                          </p>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(m.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={3}
                        placeholder="Type your reply to the reviewer…"
                        className={field + ' text-sm'}
                      />
                      <button
                        type="button"
                        disabled={replyBusy || !reply.trim()}
                        onClick={sendReply}
                        className="aid-cta-violet w-full py-2.5 text-sm disabled:opacity-50"
                      >
                        {replyBusy ? 'Sending…' : 'Send reply · إرسال'}
                      </button>
                      {replyMsg && (
                        <p className="text-xs text-center text-slate-600">{replyMsg}</p>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-slate-500 space-x-2">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>·</span>
          <Link href="/intake" className="text-emerald-700 font-medium hover:underline">
            Submit
          </Link>
          <span>·</span>
          <Link href="/guide" className="hover:underline">
            Help
          </Link>
        </p>
      </div>
    </main>
  );
}
