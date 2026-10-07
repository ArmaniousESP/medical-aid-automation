'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PharmacyLine } from '@/lib/pharmacy';

function matches(line: PharmacyLine, q: string): boolean {
  if (!q) return true;
  const hay = [
    line.patient_name,
    line.employee_name,
    line.employee_id,
    line.program_code,
    line.drug_name,
    line.line_code,
    line.claim_id,
    line.relation,
    line.cycle_status,
    line.item_status,
    line.formulary_flag,
    line.company_preferred ? 'eva' : 'not eva',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => hay.includes(token));
}

export function PharmacySearchList({
  lines,
  emptyHint,
}: {
  lines: PharmacyLine[];
  emptyHint?: boolean;
}) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => lines.filter((l) => matches(l, q.trim())), [lines, q]);

  const groups = useMemo(() => {
    const map = new Map<string, PharmacyLine[]>();
    for (const line of filtered) {
      if (!map.has(line.cycle_id)) map.set(line.cycle_id, []);
      map.get(line.cycle_id)!.push(line);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-3 shadow-sm space-y-2">
        <label htmlFor="pharmacy-search" className="text-sm font-semibold text-slate-800">
          Search · بحث
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            ⌕
          </span>
          <input
            id="pharmacy-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Patient, employee, drug, program, EVA…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            autoComplete="off"
            dir="auto"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Showing {filtered.length} of {lines.length} lines · {groups.length} patient
          {groups.length === 1 ? '' : 's'}
          {q ? (
            <span className="text-teal-800 font-medium"> · filter: “{q}”</span>
          ) : null}
        </p>
      </div>

      {groups.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500 space-y-2">
          {q ? (
            <>
              <p>No matches for “{q}”.</p>
              <button
                type="button"
                onClick={() => setQ('')}
                className="text-teal-700 font-medium underline"
              >
                Clear search
              </button>
            </>
          ) : emptyHint ? (
            <>
              <p>No lines for this period / filter.</p>
              <p className="text-xs">
                Process the{' '}
                <Link href="/intake-ops" className="text-violet-700 font-medium underline">
                  queue
                </Link>{' '}
                and generate{' '}
                <Link href="/refills" className="text-violet-700 font-medium underline">
                  refills
                </Link>{' '}
                first.
              </p>
            </>
          ) : (
            <p>No lines.</p>
          )}
        </div>
      )}

      {groups.map(([cycleId, group]) => {
        const head = group[0];
        const evaLines = group.filter((l) => l.company_preferred).length;
        return (
          <article
            key={cycleId}
            className="rounded-2xl border bg-white shadow-sm overflow-hidden"
          >
            <div className="bg-slate-50 px-4 py-3 flex flex-wrap justify-between gap-2 border-b">
              <div>
                <p className="font-semibold text-slate-900">{head.patient_name}</p>
                <p className="text-xs text-slate-600">
                  {head.employee_name}
                  {head.program_code ? ` · ${head.program_code}` : ''}
                  {head.relation ? ` · ${head.relation}` : ''}
                </p>
              </div>
              <div className="text-right space-y-1">
                <span className="inline-block rounded-full bg-white border px-2 py-0.5 text-[11px] font-semibold">
                  {head.cycle_status}
                </span>
                <p className="text-[11px] text-slate-500">
                  {evaLines}/{group.length} EVA
                </p>
                <Link
                  href={`/refills/${cycleId}`}
                  className="block text-xs font-medium text-violet-700 hover:underline"
                >
                  Cycle detail
                </Link>
              </div>
            </div>

            <ul className="md:hidden divide-y">
              {group.map((l) => (
                <li
                  key={`${l.cycle_id}-${l.line_code}`}
                  className="px-4 py-3 flex justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{l.drug_name}</p>
                    <p className="text-[11px] text-slate-500">
                      Qty {l.dispensed_qty ?? l.approved_qty ?? l.qty}
                      {' · '}
                      {l.item_status}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full h-fit ${
                      l.company_preferred
                        ? 'bg-teal-100 text-teal-900'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {l.company_preferred ? 'EVA' : 'NOT EVA'}
                  </span>
                </li>
              ))}
            </ul>

            <table className="hidden md:table w-full text-sm">
              <thead className="text-xs text-slate-500 text-left">
                <tr>
                  <th className="p-3 font-semibold">Drug</th>
                  <th className="p-3 font-semibold">Qty</th>
                  <th className="p-3 font-semibold">Route</th>
                  <th className="p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {group.map((l) => (
                  <tr
                    key={`${l.cycle_id}-${l.line_code}`}
                    className="border-t hover:bg-slate-50/80"
                  >
                    <td className="p-3 font-medium">{l.drug_name}</td>
                    <td className="p-3">
                      {l.dispensed_qty ?? l.approved_qty ?? l.qty}
                    </td>
                    <td className="p-3">
                      {l.company_preferred ? (
                        <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                          EVA
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                          NOT EVA
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-600">{l.item_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        );
      })}
    </div>
  );
}
