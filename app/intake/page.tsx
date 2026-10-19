'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicStepsBar } from '../PublicStepsBar';
import { IntakeSuccess } from '../IntakeSuccess';
import { SearchablePicker, type PickerOption } from '@/components/SearchablePicker';
import {
  CITY_OPTIONS,
  COMPANY_OPTIONS,
  RELATION_OPTIONS,
} from '@/lib/intakeOptions';
import {
  clearDraft,
  draftHasContent,
  formatDraftAge,
  loadDraft,
  loadLastRequestId,
  loadProfile,
  saveDraft,
  saveLastRequestId,
  saveProfile,
} from '@/lib/intakeDraft';
import { IntakeUrlPrefill } from '@/components/IntakeUrlPrefill';

type MedLine = { name: string; qty: number };

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none';
const label = 'block text-sm font-medium text-slate-700 mb-1.5';

async function loadMedOptions(q: string): Promise<PickerOption[]> {
  const res = await fetch('/api/intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'search_med', q, limit: 8 }),
  });
  const data = await res.json();
  const items = (data.items || []) as {
    name_en?: string;
    name_ar?: string;
    scientific_name?: string;
    manufacturer?: string;
    price_egp?: number;
  }[];
  return items.map((it) => {
    const name = it.name_en || it.name_ar || '';
    return {
      value: name,
      label: name,
      sublabel: [
        it.name_ar && it.name_en ? it.name_ar : null,
        it.scientific_name || null,
        it.price_egp != null ? `${it.price_egp} EGP` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    };
  });
}

export default function IntakePage() {
  const [emp_name, setEmpName] = useState('');
  const [emp_id, setEmpId] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [patient_name, setPatient] = useState('');
  const [relation, setRelation] = useState('self');
  const [city, setCity] = useState('');
  const [comments, setComments] = useState('');
  const [roshetta, setRoshetta] = useState('');
  const [meds, setMeds] = useState<MedLine[]>([{ name: '', qty: 1 }]);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<string | null>(null);
  const [estimateLines, setEstimateLines] = useState<
    {
      query: string;
      matched?: string;
      unit_price_egp?: number | null;
      quantity?: number;
      line_total?: number | null;
    }[]
  >([]);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [draftHint, setDraftHint] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [popularMeds, setPopularMeds] = useState<string[]>([]);

  useEffect(() => {
    const profile = loadProfile();
    const draft = loadDraft();
    setLastId(loadLastRequestId());
    if (draft) {
      setEmpName(draft.emp_name || '');
      setEmpId(draft.emp_id || '');
      setCompany(draft.company || '');
      setPhone(draft.phone || '');
      setPatient(draft.patient_name || '');
      setRelation(draft.relation || 'self');
      setCity(draft.city || '');
      setComments(draft.comments || '');
      setRoshetta(draft.roshetta || '');
      setMeds(draft.meds?.length ? draft.meds : [{ name: '', qty: 1 }]);
      setDraftSavedAt(draft.savedAt || Date.now());
      setDraftHint('Draft restored');
    } else if (profile) {
      setEmpName(profile.emp_name || '');
      setEmpId(profile.emp_id || '');
      setCompany(profile.company || '');
      setPhone(profile.phone || '');
      setCity(profile.city || '');
      setDraftHint('Welcome back');
    }
    setHydrated(true);
    void fetch('/api/learning?key=medicine&limit=6')
      .then((r) => r.json())
      .then((d) => {
        const items = (d.items || []) as { value: string }[];
        setPopularMeds(items.map((i) => i.value).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hydrated || resultId) return;
    const t = window.setTimeout(() => {
      if (
        !draftHasContent({
          emp_name,
          emp_id,
          company,
          phone,
          patient_name,
          relation,
          city,
          comments,
          roshetta,
          meds,
        })
      )
        return;
      const at = saveDraft({
        emp_name,
        emp_id,
        company,
        phone,
        patient_name,
        relation,
        city,
        comments,
        roshetta,
        meds,
      });
      setDraftSavedAt(at);
    }, 400);
    return () => window.clearTimeout(t);
  }, [
    hydrated,
    resultId,
    emp_name,
    emp_id,
    company,
    phone,
    patient_name,
    relation,
    city,
    comments,
    roshetta,
    meds,
  ]);

  function updateMed(i: number, patch: Partial<MedLine>) {
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  const medLoader = useCallback((q: string) => loadMedOptions(q), []);

  async function runEstimate() {
    const lines = meds
      .filter((m) => m.name.trim())
      .map((m) => ({ query: m.name, quantity: m.qty || 1 }));
    if (!lines.length) {
      setEstimate('Add at least one medicine first');
      setEstimateLines([]);
      return;
    }
    setEstimating(true);
    setEstimate(null);
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'estimate', lines }),
      });
      const data = await res.json();
      setEstimateLines(Array.isArray(data.lines) ? data.lines : []);
      if (data.total_egp != null) {
        setEstimate(`≈ ${data.total_egp} EGP · Egyptian catalog`);
      } else {
        setEstimate(data.error || 'No price match in catalog');
      }
    } catch {
      setEstimate('Estimate failed — try again');
      setEstimateLines([]);
    } finally {
      setEstimating(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultId(null);
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emp_name,
          emp_id,
          company,
          phone,
          patient_name,
          relation,
          city,
          comments,
          meds: meds.filter((m) => m.name.trim()),
          roshetta_urls: roshetta
            .split(/[,\n]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          source: 'platform',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Submit failed');
      saveProfile({
        emp_name: emp_name.trim(),
        emp_id: emp_id.trim(),
        company: company.trim(),
        phone: phone.trim(),
        city: city.trim(),
      });
      saveLastRequestId(String(data.id));
      setLastId(String(data.id));
      clearDraft();
      setDraftHint(null);
      setDraftSavedAt(null);
      setResultId(data.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen pb-28" style={{ color: 'var(--aid-ink)' }}>
      <div className="mx-auto max-w-lg px-4 pt-6 space-y-5">
        <PublicStepsBar active="submit" />
        <IntakeUrlPrefill
          onApply={(patch) => {
            if (patch.emp_name) setEmpName(patch.emp_name);
            if (patch.emp_id) setEmpId(patch.emp_id);
            if (patch.company) setCompany(patch.company);
            if (patch.phone) setPhone(patch.phone);
            if (patch.patient_name) setPatient(patch.patient_name);
            if (patch.relation) setRelation(patch.relation);
            if (patch.meds?.length) setMeds(patch.meds);
            if (patch.comments) setComments(patch.comments);
            if (patch.hint) setDraftHint(patch.hint);
          }}
        />
        <header className="space-y-1 text-center sm:text-left">
          <h1 className="aid-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Submit request
          </h1>
          <p className="text-base" style={{ color: 'var(--aid-muted)' }} dir="rtl">
            تقديم طلب علاج شهري
          </p>
          <p className="text-sm" style={{ color: 'var(--aid-muted)' }}>
            ~25k Egyptian medicines · أسعار السوق المصرية
          </p>
        </header>

        {!resultId && (draftHint || draftSavedAt) && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-sky-900 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{draftHint || 'Draft auto-saved · مسودة محفوظة'}</span>
              {draftSavedAt && (
                <span className="text-xs text-sky-700">{formatDraftAge(draftSavedAt)}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white"
                onClick={() => {
                  const at = saveDraft({
                    emp_name,
                    emp_id,
                    company,
                    phone,
                    patient_name,
                    relation,
                    city,
                    comments,
                    roshetta,
                    meds,
                  });
                  setDraftSavedAt(at);
                  setDraftHint('Draft saved · تم الحفظ');
                }}
              >
                Save now · حفظ
              </button>
              <button
                type="button"
                className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900"
                onClick={() => {
                  clearDraft();
                  setDraftSavedAt(null);
                  setDraftHint(null);
                }}
              >
                Clear draft · مسح
              </button>
            </div>
          </div>
        )}

        {lastId && !resultId && (
          <Link
            href={`/request-status?id=${encodeURIComponent(lastId)}`}
            className="block rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 hover:bg-emerald-100"
          >
            Last request · آخر طلب:{' '}
            <span className="font-mono font-semibold">{lastId.slice(0, 8)}…</span>
          </Link>
        )}

        {resultId ? (
          <IntakeSuccess
            resultId={resultId}
            copied={copied}
            linkCopied={linkCopied}
            onCopyId={async () => {
              try {
                await navigator.clipboard.writeText(resultId);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              } catch {}
            }}
            onShare={async () => {
              const url = `${window.location.origin}/request-status?id=${encodeURIComponent(resultId)}`;
              try {
                await navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2500);
              } catch {}
            }}
            onCopyLink={async () => {
              const url = `${window.location.origin}/request-status?id=${encodeURIComponent(resultId)}`;
              try {
                await navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2500);
              } catch {}
            }}
            onAnother={() => {
              setResultId(null);
              setMeds([{ name: '', qty: 1 }]);
              setComments('');
              setRoshetta('');
              setPatient('');
              setEstimate(null);
              setEstimateLines([]);
            }}
          />
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <section
              className="rounded-2xl border p-5 shadow-sm space-y-4"
              style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
            >
              <h2 className="text-sm font-semibold">A · About you · بيانات الموظف</h2>
              <label className="block">
                <span className={label}>Employee name *</span>
                <input required value={emp_name} onChange={(e) => setEmpName(e.target.value)} className={field} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={label}>Employee ID</span>
                  <input value={emp_id} onChange={(e) => setEmpId(e.target.value)} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Phone</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
                </label>
              </div>
              <label className="block">
                <span className={label}>Company</span>
                <SearchablePicker
                  value={company}
                  onChange={setCompany}
                  options={COMPANY_OPTIONS}
                  learnKey="company"
                  allowCreate
                  placeholder="Search or add company…"
                />
              </label>
            </section>

            <section
              className="rounded-2xl border p-5 shadow-sm space-y-4"
              style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
            >
              <h2 className="text-sm font-semibold">B · Patient · المريض</h2>
              <label className="block">
                <span className={label}>Patient name *</span>
                <input required value={patient_name} onChange={(e) => setPatient(e.target.value)} className={field} />
              </label>
              <label className="block">
                <span className={label}>Relation</span>
                <SearchablePicker
                  value={relation}
                  onChange={setRelation}
                  options={RELATION_OPTIONS}
                  learnKey="relation"
                  allowCreate
                />
              </label>
              <label className="block">
                <span className={label}>City</span>
                <SearchablePicker
                  value={city}
                  onChange={setCity}
                  options={CITY_OPTIONS}
                  learnKey="city"
                  allowCreate
                />
              </label>
            </section>

            <section
              className="rounded-2xl border p-5 shadow-sm space-y-4"
              style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
            >
              <h2 className="text-sm font-semibold">C · Medicines · الأدوية</h2>
              {meds.map((m, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_auto]">
                  <SearchablePicker
                    value={m.name}
                    onChange={(v) => updateMed(i, { name: v })}
                    loadOptions={medLoader}
                    learnKey="medicine"
                    allowCreate
                    placeholder="Medicine name…"
                  />
                  <input
                    type="number"
                    min={1}
                    value={m.qty}
                    onChange={(e) => updateMed(i, { qty: Number(e.target.value) || 1 })}
                    className={field}
                  />
                  <button
                    type="button"
                    className="text-xs font-semibold"
                    style={{ color: 'var(--aid-muted)' }}
                    onClick={() => setMeds((prev) => prev.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-sm font-semibold"
                style={{ color: 'var(--aid-emerald)' }}
                onClick={() => setMeds((prev) => [...prev, { name: '', qty: 1 }])}
              >
                + Add medicine
              </button>
              {popularMeds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {popularMeds.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="rounded-full border px-2.5 py-1 text-xs"
                      style={{ borderColor: 'var(--aid-line)' }}
                      onClick={() => setMeds((prev) => [...prev, { name, qty: 1 }])}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              <div className="pt-1 space-y-2 border-t" style={{ borderColor: 'var(--aid-line)' }}>
                <button
                  type="button"
                  disabled={estimating}
                  onClick={() => void runEstimate()}
                  className="w-full rounded-xl border py-2.5 text-sm font-semibold disabled:opacity-50"
                  style={{
                    borderColor: 'var(--aid-line)',
                    background: 'var(--aid-paper)',
                    color: 'var(--aid-ink)',
                  }}
                >
                  {estimating ? 'Estimating…' : 'Estimate monthly cost · تقدير التكلفة'}
                </button>
                {estimate && (
                  <p className="text-sm font-semibold" style={{ color: 'var(--aid-emerald)' }}>
                    {estimate}
                  </p>
                )}
                {estimateLines.length > 0 && (
                  <ul className="text-xs space-y-1" style={{ color: 'var(--aid-muted)' }}>
                    {estimateLines.map((ln, i) => (
                      <li key={i}>
                        {ln.matched || ln.query}
                        {ln.line_total != null ? ` · ${ln.line_total} EGP` : ''}
                        {ln.unit_price_egp != null ? ` (${ln.unit_price_egp} × ${ln.quantity || 1})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section
              className="rounded-2xl border p-5 shadow-sm space-y-4"
              style={{ background: 'var(--aid-surface)', borderColor: 'var(--aid-line)' }}
            >
              <label className="block">
                <span className={label}>Comments</span>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className={field + ' min-h-[80px]'}
                />
              </label>
              <label className="block">
                <span className={label}>Prescription / invoice links</span>
                <textarea
                  value={roshetta}
                  onChange={(e) => setRoshetta(e.target.value)}
                  className={field + ' min-h-[60px]'}
                  placeholder="https://…"
                />
              </label>
            </section>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="aid-cta-primary w-full py-3.5 text-base disabled:opacity-50"
            >
              {loading ? 'Submitting…' : 'Submit request · إرسال الطلب'}
            </button>
          </form>
        )}

        <p className="text-center text-sm" style={{ color: 'var(--aid-muted)' }}>
          <Link href="/" className="font-medium hover:underline" style={{ color: 'var(--aid-emerald)' }}>
            Home
          </Link>
          {' · '}
          <Link href="/request-status" className="hover:underline">
            Status
          </Link>
          {' · '}
          <Link href="/me" className="hover:underline">
            Profile
          </Link>
        </p>
      </div>
    </main>
  );
}
