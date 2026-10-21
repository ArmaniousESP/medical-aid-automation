'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PublicStepsBar } from '../PublicStepsBar';
import { loadLastRequestId, loadProfile, saveLastRequestId } from '@/lib/intakeDraft';

const field = 'aid-input';

function StatusForm() {
  const search = useSearchParams();
  const [id, setId] = useState('');
  const [phone, setPhone] = useState('');
  const [empId, setEmpId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [fromDevice, setFromDevice] = useState(false);
  const [pasted, setPasted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const qid = search?.get('id');
    if (qid) setId(qid);
    else {
      const last = loadLastRequestId();
      if (last) {
        setId(last);
        setFromDevice(true);
      }
    }
    const profile = loadProfile();
    if (profile) {
      if (profile.phone) setPhone(profile.phone);
      if (profile.emp_id) setEmpId(profile.emp_id);
    }
    const qp = search?.get('phone');
    const qe = search?.get('emp_id');
    if (qp) setPhone(qp);
    if (qe) setEmpId(qe);
  }, [search]);

  useEffect(() => {
    if (id && /^[0-9a-f-]{36}$/i.test(id.trim())) {
      void lookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, phone, empId]);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const q = new URLSearchParams({ id: id.trim() });
      if (phone.trim()) q.set('phone', phone.trim());
      if (empId.trim()) q.set('emp_id', empId.trim());
      const res = await fetch(`/api/request-status?${q}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Not found');
      setData(json);
      saveLastRequestId(id.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function pasteId() {
    try {
      const t = await navigator.clipboard.readText();
      if (t?.trim()) {
        setId(t.trim());
        setFromDevice(false);
        setPasted(true);
        setTimeout(() => setPasted(false), 2000);
      }
    } catch {
      setError('Could not read clipboard — paste manually');
    }
  }

  function statusUrl() {
    if (!id.trim() || typeof window === 'undefined') return '';
    return `${window.location.origin}/request-status?id=${encodeURIComponent(id.trim())}`;
  }

  async function copyLink() {
    if (!id.trim()) return;
    const url = statusUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Could not copy link');
    }
  }

  async function shareLink() {
    if (!id.trim()) return;
    const url = statusUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Medical aid request status',
          text: `Request ID: ${id.trim()}`,
          url,
        });
        return;
      } catch {
        /* cancelled or failed — fall through */
      }
    }
    await copyLink();
  }

  const status = String(data?.status || '');
  const patient = data?.patient_name != null ? String(data.patient_name) : null;
  const meds = Array.isArray(data?.medicines)
    ? (data!.medicines as Array<Record<string, unknown>>)
    : [];

  return (
    <div className="space-y-5">
      <form
        onSubmit={lookup}
        className="rounded-2xl border p-5 shadow-sm space-y-4"
        style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
      >
        <label className="block">
          <span className="aid-label">Request ID · رقم الطلب</span>
          <div className="flex gap-2">
            <input
              required
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setFromDevice(false);
              }}
              className={field + ' font-mono text-sm'}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={pasteId}
              className="shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold"
              style={{ borderColor: 'var(--aid-line)', background: 'var(--aid-paper)' }}
            >
              {pasted ? '✓' : 'Paste'}
            </button>
          </div>
          {fromDevice && (
            <p className="aid-hint text-emerald-700">Using last request saved on this device</p>
          )}
        </label>

        <details className="text-sm" open={!!(phone || empId)} style={{ color: 'var(--aid-muted)' }}>
          <summary className="cursor-pointer font-medium" style={{ color: 'var(--aid-ink)' }}>
            Optional verification · تحقق اختياري
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium">Phone · الهاتف</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={field + ' mt-1'}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium">Employee ID · الرقم الوظيفي</span>
              <input
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className={field + ' mt-1'}
              />
            </label>
          </div>
          <p className="mt-2 text-[11px]">
            Enter the same phone or employee ID used on the request to unlock full names — others stay
            masked.
          </p>
        </details>

        <button
          type="submit"
          disabled={loading || !id.trim()}
          className="aid-cta-primary w-full py-3.5 text-base disabled:opacity-50"
        >
          {loading ? 'Looking up… · جاري البحث' : 'Check status · فحص الحالة'}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/95 p-5 text-sm space-y-3">
          <p className="font-semibold">We couldn't find that request</p>
          <p className="text-xs" dir="rtl">
            لم نعثر على الطلب — تأكد من رقم الطلب أو قدّم طلباً جديداً
          </p>
          <Link
            href="/intake"
            className="inline-block text-xs font-semibold"
            style={{ color: 'var(--aid-emerald)' }}
          >
            Submit a new request →
          </Link>
        </div>
      )}

      {data && (
        <div
          className="rounded-2xl border p-5 shadow-sm space-y-4"
          style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--aid-muted)' }}>
                Status
              </p>
              <p className="text-lg font-semibold">{status || '—'}</p>
              {patient && <p className="text-sm mt-1">{patient}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => void shareLink()}
                className="text-xs font-semibold underline"
                style={{ color: 'var(--aid-emerald)' }}
              >
                Share · مشاركة
              </button>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="text-xs font-semibold underline"
                style={{ color: 'var(--aid-muted)' }}
              >
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            </div>
          </div>
          {meds.length > 0 && (
            <ul className="text-sm space-y-1.5">
              {meds.map((m, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: 'var(--aid-muted)' }}>{String(m.qty ?? 1)}×</span>
                  <span>{String(m.name || m.matched_name || 'Medicine')}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] font-mono break-all" style={{ color: 'var(--aid-muted)' }}>
            {id}
          </p>
        </div>
      )}

      <p className="text-center text-sm" style={{ color: 'var(--aid-muted)' }}>
        <Link href="/" className="font-medium hover:underline" style={{ color: 'var(--aid-emerald)' }}>
          Home
        </Link>
        {' · '}
        <Link href="/me" className="hover:underline">
          My profile
        </Link>
        {' · '}
        <Link href="/intake" className="hover:underline">
          New request
        </Link>
      </p>
    </div>
  );
}

export default function RequestStatusPage() {
  return (
    <main className="min-h-screen p-4 sm:p-6 pb-24" style={{ color: 'var(--aid-ink)' }}>
      <div className="mx-auto max-w-md space-y-5">
        <PublicStepsBar active="status" />
        <header className="space-y-2 text-center aid-rise">
          <p className="aid-section-label">Track your request · متابعة</p>
          <h1 className="aid-display text-3xl sm:text-4xl font-semibold tracking-tight">Request status</h1>
          <p className="text-sm" style={{ color: 'var(--aid-muted)' }} dir="rtl">
            متابعة حالة طلب العلاج الشهري
          </p>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--aid-muted)' }}>
            Use your Request ID. Add phone or employee ID to unlock full names when this is your request
            — others stay masked.
          </p>
        </header>
        <Suspense fallback={<p className="text-center text-sm" style={{ color: 'var(--aid-muted)' }}>Loading…</p>}>
          <StatusForm />
        </Suspense>
      </div>
    </main>
  );
}
