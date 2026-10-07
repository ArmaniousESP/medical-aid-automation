'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PublicStepsBar } from '../PublicStepsBar';
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
    price_egp?: number;
  }[];
  return items.map((it) => {
    const name = it.name_en || it.name_ar || '';
    return {
      value: name,
      label: name,
      sublabel: [
        it.name_ar && it.name_en ? it.name_ar : null,
        it.price_egp != null ? `~${it.price_egp} EGP` : null,
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
  const [resultId, setResultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [draftHint, setDraftHint] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [popularMeds, setPopularMeds] = useState<string[]>([]);

  useEffect(() => {
    const draft = loadDraft();
    const profile = loadProfile();
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
      if (!draftHasContent({
        emp_name, emp_id, company, phone, patient_name, relation, city, comments, roshetta, meds,
      })) return;
      const at = saveDraft({
        emp_name, emp_id, company, phone, patient_name, relation, city, comments, roshetta, meds,
      });
      setDraftSavedAt(at);
    }, 400);
    return () => window.clearTimeout(t);
  }, [hydrated, resultId, emp_name, emp_id, company, phone, patient_name, relation, city, comments, roshetta, meds]);

  useEffect(() => {
    function onLeave(e: BeforeUnloadEvent) {
      if (resultId) return;
      if (!draftHasContent({ emp_name, emp_id, company, phone, patient_name, city, comments, roshetta, meds })) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [resultId, emp_name, emp_id, company, phone, patient_name, city, comments, roshetta, meds]);

  const dupNames = useMemo(() => {
    const seen = new Map<string, number>();
    for (const m of meds) {
      const k = m.name.trim().toLowerCase();
      if (!k) continue;
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  }, [meds]);

  function updateMed(i: number, patch: Partial<MedLine>) {
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function addPopularMed(name: string) {
    setMeds((prev) => {
      const emptyIdx = prev.findIndex((m) => !m.name.trim());
      if (emptyIdx >= 0) {
        return prev.map((m, i) => (i === emptyIdx ? { ...m, name } : m));
      }
      if (prev.some((m) => m.name.trim().toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, { name, qty: 1 }];
    });
  }

  const medLoader = useCallback((q: string) => loadMedOptions(q), []);

  async function copyId() {
    if (!resultId) return;
    try {
      await navigator.clipboard.writeText(resultId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  function statusUrl(id: string) {
    if (typeof window === 'undefined') return `/request-status?id=${encodeURIComponent(id)}`;
    return `${window.location.origin}/request-status?id=${encodeURIComponent(id)}`;
  }

  async function copyStatusLink() {
    if (!resultId) return;
    try {
      await navigator.clipboard.writeText(statusUrl(resultId));
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {}
  }

  async function shareStatus() {
    if (!resultId) return;
    const url = statusUrl(resultId);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Medical aid request status',
          text: `Request ID: ${resultId}`,
          url,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    await copyStatusLink();
  }

  async function runEstimate() {
    const lines = meds.filter((m) => m.name.trim()).map((m) => ({ query: m.name, quantity: m.qty || 1 }));
    if (!lines.length) return;
    const res = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'estimate', lines }),
    });
    const data = await res.json();
    setEstimate(data.total_egp != null ? `~${data.total_egp} EGP` : data.error || 'No estimate');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultId(null);
    setCopied(false);
    setLinkCopied(false);
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emp_name, emp_id, company, phone, patient_name, relation, city, comments,
          meds: meds.filter((m) => m.name.trim()),
          roshetta_urls: roshetta.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean),
          source: 'platform',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Submit failed');
      const signals: { key: string; value: string; weight?: number }[] = [];
      if (company.trim()) signals.push({ key: 'company', value: company.trim() });
      if (city.trim()) signals.push({ key: 'city', value: city.trim() });
      if (relation.trim()) signals.push({ key: 'relation', value: relation.trim() });
      for (const m of meds) {
        if (m.name.trim()) signals.push({ key: 'medicine', value: m.name.trim(), weight: 1.5 });
      }
      if (signals.length) {
        void fetch('/api/learning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signals }),
          keepalive: true,
        }).catch(() => {});
      }
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
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-28 md:pb-12">
      <div className="mx-auto max-w-lg px-4 pt-6 space-y-5">
        <PublicStepsBar active="submit" />
        <header className="space-y-1 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Submit request</h1>
          <p className="text-base text-slate-600" dir="rtl">تقديم طلب علاج شهري</p>
          <p className="text-sm text-slate-500">Auto-saves as you type · يحفظ تلقائياً</p>
        </header>

        {!resultId && (draftHint || draftSavedAt) && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{draftHint || 'Draft auto-saved · مسودة محفوظة'}</span>
              {draftSavedAt && <span className="text-xs text-sky-700">{formatDraftAge(draftSavedAt)}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => {
                const at = saveDraft({ emp_name, emp_id, company, phone, patient_name, relation, city, comments, roshetta, meds });
                setDraftSavedAt(at);
                setDraftHint('Draft saved · تم الحفظ');
              }}>Save now · حفظ</button>
              <button type="button" className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900" onClick={() => {
                clearDraft(); setDraftSavedAt(null); setDraftHint(null);
              }}>Clear draft · مسح</button>
            </div>
          </div>
        )}

        {lastId && !resultId && (
          <Link href={`/request-status?id=${encodeURIComponent(lastId)}`} className="block rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 hover:bg-emerald-100">
            Last request · آخر طلب: <span className="font-mono font-semibold">{lastId.slice(0, 8)}…</span>
          </Link>
        )}

        {resultId && (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 space-y-3 shadow-sm">
            <p className="font-semibold text-emerald-950">Request received · تم الاستلام</p>
            <p className="font-mono text-lg font-bold select-all">{resultId}</p>
            <button type="button" onClick={copyId} className="w-full rounded-xl bg-emerald-700 py-3 text-white font-semibold">{copied ? 'Copied ✓' : 'Copy Request ID'}</button>
            <button type="button" onClick={shareStatus} className="w-full rounded-xl border-2 border-emerald-600 bg-white py-3 font-semibold text-emerald-800">
              Share status link · مشاركة الرابط
            </button>
            <button type="button" onClick={copyStatusLink} className="w-full text-sm text-emerald-800 font-medium hover:underline">
              {linkCopied ? 'Link copied ✓' : 'Copy status link only'}
            </button>
            <Link href={`/request-status?id=${encodeURIComponent(resultId)}`} className="block w-full rounded-xl bg-emerald-100 py-3 text-center font-semibold text-emerald-900">Check status →</Link>
            <button type="button" onClick={() => { setResultId(null); setMeds([{ name: '', qty: 1 }]); setComments(''); setRoshetta(''); setPatient(''); }} className="w-full text-sm text-slate-500 underline">Submit another</button>
          </div>
        )}

        {!resultId && (
          <form onSubmit={submit} className="space-y-5">
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold">A · About you · بيانات الموظف</h2>
              <label className="block"><span className={label}>Employee name *</span><input required value={emp_name} onChange={(e) => setEmpName(e.target.value)} className={field} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className={label}>Employee ID</span><input value={emp_id} onChange={(e) => setEmpId(e.target.value)} className={field} /></label>
                <label className="block"><span className={label}>Phone</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} /></label>
              </div>
              <label className="block"><span className={label}>Company</span>
                <SearchablePicker value={company} onChange={setCompany} options={COMPANY_OPTIONS} learnKey="company" allowCreate placeholder="Search or add company…" />
              </label>
            </section>
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold">B · Patient · المريض</h2>
              <label className="block"><span className={label}>Patient name</span><input value={patient_name} onChange={(e) => setPatient(e.target.value)} className={field} /></label>
              <label className="block"><span className={label}>Relation</span>
                <SearchablePicker value={relation} onChange={setRelation} options={RELATION_OPTIONS} learnKey="relation" allowCreate />
              </label>
              <label className="block"><span className={label}>City</span>
                <SearchablePicker value={city} onChange={setCity} options={CITY_OPTIONS} learnKey="city" allowCreate placeholder="City…" />
              </label>
            </section>
            <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold">C · Medicines *</h2>
                <button type="button" onClick={() => setMeds((m) => [...m, { name: '', qty: 1 }])} className="text-xs font-semibold text-emerald-800">+ Add</button>
              </div>
              {popularMeds.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-violet-800">Quick add popular · شائع</p>
                  <div className="flex flex-wrap gap-1.5">
                    {popularMeds.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => addPopularMed(name)}
                        className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-900 hover:bg-violet-100"
                      >
                        + {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {dupNames.length > 0 && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Duplicate medicine listed: {dupNames.join(', ')}. You can still submit, or remove the extra line.
                </p>
              )}
              {meds.map((m, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <SearchablePicker value={m.name} onChange={(v) => updateMed(i, { name: v })} loadOptions={medLoader} learnKey="medicine" allowCreate minQueryLength={2} required={i === 0} placeholder={`Medicine ${i + 1}`} createLabel={(q) => `Use “${q}”`} />
                  </div>
                  <input type="number" min={1} value={m.qty} onChange={(e) => updateMed(i, { qty: Number(e.target.value) || 1 })} className={field + ' w-20'} />
                  {meds.length > 1 && (
                    <button type="button" onClick={() => setMeds((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-red-600 mt-3">✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={runEstimate} className="text-sm text-violet-700 font-medium">Estimate cost</button>
              {estimate && <p className="text-xs text-slate-600">{estimate}</p>}
            </section>
            <details className="rounded-2xl border bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold">Optional notes / links</summary>
              <textarea value={roshetta} onChange={(e) => setRoshetta(e.target.value)} rows={2} className={field + ' mt-2 text-sm'} placeholder="Roshetta URLs" />
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} className={field + ' mt-2'} placeholder="Notes" />
            </details>
            {error && <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white disabled:opacity-50">{loading ? 'Sending…' : 'Submit request · إرسال'}</button>
          </form>
        )}
        <p className="text-center text-sm text-slate-500">
          <Link href="/request-status" className="text-emerald-700 font-medium hover:underline">Check status</Link>
          {' · '}
          <Link href="/" className="hover:underline">Home</Link>
        </p>
      </div>
    </main>
  );
}
