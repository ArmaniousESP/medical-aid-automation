'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [resultId, setResultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<string | null>(null);
  const [estimateLines, setEstimateLines] = useState<
    { query: string; matched?: string; unit_price_egp?: number | null; quantity?: number; line_total?: number | null }[]
  >([]);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [draftHint, setDraftHint] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [popularMeds, setPopularMeds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLastId(loadLastRequestId());

      const sp = new URLSearchParams(window.location.search);
      const regimenId = sp.get('regimen_id') || '';
      const hasRenew =
        sp.get('renew') === '2027' ||
        !!regimenId ||
        !!sp.get('meds') ||
        !!sp.get('patient');

      let stored: Record<string, unknown> | null = null;
      try {
        const raw = sessionStorage.getItem('maa_renew_prefill');
        if (raw) {
          stored = JSON.parse(raw) as Record<string, unknown>;
          sessionStorage.removeItem('maa_renew_prefill');
        }
      } catch {
        /* ignore */
      }

      if (hasRenew || stored) {
        let company = String(sp.get('company') || stored?.company || '');
        let emp_id = String(sp.get('emp_id') || stored?.emp_id || '');
        let emp_name = String(sp.get('emp_name') || stored?.emp_name || '');
        let phone = String(sp.get('phone') || stored?.phone || '');
        let patient_name = String(sp.get('patient') || stored?.patient_name || '');
        let meds: MedLine[] = [];

        const storedMeds = stored?.meds;
        if (Array.isArray(storedMeds)) {
          meds = storedMeds
            .map((m: unknown) => {
              const x = m as { name?: string; qty?: number };
              return { name: String(x?.name || '').trim(), qty: Number(x?.qty) || 1 };
            })
            .filter((m) => m.name);
        }

        const medsParam = sp.get('meds');
        if (!meds.length && medsParam) {
          meds = medsParam
            .split(';')
            .map((s) => {
              const pipe = s.indexOf('|');
              if (pipe < 0) {
                const name = s.trim();
                return name ? { name, qty: 1 } : null;
              }
              const name = s.slice(0, pipe).trim();
              const qty = Number(s.slice(pipe + 1)) || 1;
              return name ? { name, qty } : null;
            })
            .filter((m): m is MedLine => !!m);
        }

        const rid = regimenId || String(stored?.regimen_id || '');
        if (rid) {
          try {
            const res = await fetch(
              `/api/employee/regimens?id=${encodeURIComponent(rid)}`
            );
            const data = await res.json();
            if (res.ok && data.ok && data.regimen) {
              const r = data.regimen;
              if (!company && r.company) company = r.company;
              if (!emp_name && r.emp_name) emp_name = r.emp_name;
              if (!emp_id && r.emp_id) emp_id = String(r.emp_id);
              if (!phone && r.phone) phone = String(r.phone);
              if (!patient_name && r.patient_name) patient_name = r.patient_name;
              const fromDb = (r.meds || [])
                .map((m: { name?: string; requested_name?: string; qty?: number }) => ({
                  name: String(m.name || m.requested_name || '').trim(),
                  qty: Number(m.qty) || 1,
                }))
                .filter((m: MedLine) => m.name);
              if (fromDb.length) meds = fromDb;
            }
          } catch {
            /* keep URL/storage meds */
          }
        }

        if (cancelled) return;

        if (company) setCompany(company);
        if (emp_id) setEmpId(emp_id);
        if (emp_name) setEmpName(emp_name);
        if (phone) setPhone(phone);
        if (patient_name) setPatient(patient_name);
        if (meds.length) setMeds(meds);
        setComments(
          'Renewal for 2027 chronic medicine support · تجديد دعم 2027'
        );
        if (
          patient_name &&
          emp_name &&
          patient_name.replace(/\s+/g, '') === emp_name.replace(/\s+/g, '')
        ) {
          setRelation('self');
        } else if (patient_name) {
          setRelation('dependent');
        }
        setDraftHint(
          meds.length
            ? `2027 renewal pre-filled · ${meds.length} medicine(s) — review and submit`
            : '2027 renewal — review fields and add medicines if needed'
        );
        setHydrated(true);
      } else {
        const draft = loadDraft();
        const profile = loadProfile();
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
        if (!cancelled) setHydrated(true);
      }

      void fetch('/api/learning?key=medicine&limit=6')
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          const items = (d.items || []) as { value: string }[];
          setPopularMeds(items.map((i) => i.value).filter(Boolean));
        })
        .catch(() => {});
    }

    void init();
    return () => {
      cancelled = true;
    };
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
      } catch {}
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
    setEstimateLines(Array.isArray(data.lines) ? data.lines : []);
    if (data.total_egp != null) {
      setEstimate(`~${data.total_egp} EGP · Egyptian catalog`);
    } else {
      setEstimate(data.error || 'No price match in catalog');
    }
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
    <main className="min-h-screen text-slate-900 pb-28 md:pb-12">
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Submit request</h1>
          <p className="text-base text-slate-600" dir="rtl">تقديم طلب علاج شهري</p>
          <p className="text-sm text-slate-500">
            ~25k Egyptian medicines · أسعار السوق المصرية
          </p>
        </header>

        {!resultId && (draftHint || draftSavedAt) && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-sky-900 space-y-2 backdrop-blur">
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
          <Link href={`/request-status?id=${encodeURIComponent(lastId)}`} className="block rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 hover:bg-emerald-100 backdrop-blur">
            Last request · آخر طلب: <span className="font-mono font-semibold">{lastId.slice(0, 8)}…</span>
          </Link>
        )}

        {resultId && (
          <IntakeSuccess
            resultId={resultId}
            copied={copied}
            linkCopied={linkCopied}
            onCopyId={copyId}
            onShare={shareStatus}
            onCopyLink={copyStatusLink}
            onAnother={() => {
              setResultId(null);
              setMeds([{ name: '', qty: 1 }]);
              setComments('');
              setRoshetta('');
              setPatient('');
            }}
          />
        )}

        {!resultId && (
          <form onSubmit={submit} className="space-y-5">
            <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm space-y-4 backdrop-blur">
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
            <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm space-y-4 backdrop-blur">
              <h2 className="text-sm font-semibold">B · Patient · المريض</h2>
              <label className="block"><span className={label}>Patient name</span><input value={patient_name} onChange={(e) => setPatient(e.target.value)} className={field} /></label>
              <label className="block"><span className={label}>Relation</span>
                <SearchablePicker value={relation} onChange={setRelation} options={RELATION_OPTIONS} learnKey="relation" allowCreate />
              </label>
              <label className="block"><span className={label}>City</span>
                <SearchablePicker value={city} onChange={setCity} options={CITY_OPTIONS} learnKey="city" allowCreate placeholder="City…" />
              </label>
            </section>
            <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm space-y-4 backdrop-blur">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold">C · Medicines *</h2>
                <button type="button" onClick={() => setMeds((m) => [...m, { name: '', qty: 1 }])} className="text-xs font-semibold text-emerald-800">+ Add</button>
              </div>
              <p className="text-[11px] text-slate-500">
                Search Egyptian catalog (EN / AR / scientific) · قاعدة الأدوية المصرية
              </p>
              {popularMeds.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-violet-800">Quick add popular · شائع</p>
                  <div className="flex flex-wrap gap-1.5">
                    {popularMeds.map((name) => (
                      <button key={name} type="button" onClick={() => addPopularMed(name)} className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-900 hover:bg-violet-100">+ {name}</button>
                    ))}
                  </div>
                </div>
              )}
              {dupNames.length > 0 && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Duplicate medicine listed: {dupNames.join(', ')}. You can still submit, or remove the extra line.
                </p>
              )}
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 px-0.5">
                <span className="flex-1">Medicine name · اسم الدواء</span>
                <span className="w-16 text-center shrink-0">Qty</span>
                <span className="w-8 shrink-0" aria-hidden />
              </div>
              {meds.map((m, i) => (
                <div key={`${i}-${m.name}`} className="flex gap-2 items-center">
                  <div className="min-w-0 flex-1">
                    <SearchablePicker
                      value={m.name}
                      onChange={(v) => updateMed(i, { name: v })}
                      loadOptions={medLoader}
                      learnKey="medicine"
                      allowCreate
                      minQueryLength={1}
                      required={i === 0}
                      placeholder="Type to search catalog…"
                      createLabel={(q) => `Use “${q}”`}
                    />
                  </div>
                  <input type="number" min={1} inputMode="numeric" value={m.qty} onChange={(e) => updateMed(i, { qty: Number(e.target.value) || 1 })} aria-label={`Quantity for medicine ${i + 1}`} className="w-16 shrink-0 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center text-base shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
                  <button type="button" disabled={meds.length <= 1} onClick={() => setMeds((prev) => prev.filter((_, idx) => idx !== i))} className="w-8 shrink-0 text-slate-400 hover:text-red-600 disabled:opacity-30" aria-label="Remove line">×</button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={runEstimate} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">Estimate cost · تقدير</button>
                {estimate && <span className="text-sm text-slate-600 self-center">{estimate}</span>}
              </div>
              {estimateLines.length > 0 && (
                <ul className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-2">
                  {estimateLines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{l.matched || l.query}</span>
                      <span className="shrink-0">{l.line_total != null ? `${l.line_total} EGP` : '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
              <label className="block"><span className={label}>Roshetta / attachment links</span>
                <textarea value={roshetta} onChange={(e) => setRoshetta(e.target.value)} rows={2} className={field} placeholder="Optional URLs" />
              </label>
              <label className="block"><span className={label}>Comments</span>
                <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} className={field} />
              </label>
            </section>
            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="aid-cta-primary w-full py-3.5 text-base disabled:opacity-50">
              {loading ? 'Submitting…' : 'Submit request · إرسال الطلب'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
