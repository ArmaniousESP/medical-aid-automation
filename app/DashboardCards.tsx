'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Stats = {
  programs_active: number;
  programs_total: number;
  med_lines_active: number;
  refills_in_review: number;
  refills_dispensed_this_month: number;
  estimated_this_month_egp: number;
  approved_this_month_egp: number;
  period: string;
};

export function DashboardCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [safetyFlagged, setSafetyFlagged] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || 'No data');
        setStats(d);
      })
      .catch((e) => setErr(e.message));

    fetch('/api/refills/safety-queue?limit=30')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setSafetyFlagged(d.flagged ?? 0);
      })
      .catch(() => setSafetyFlagged(null));
  }, []);

  if (err) {
    return (
      <p className="text-xs text-slate-400 mb-6">
        Dashboard unavailable ({err}). Set DATABASE_URL.
      </p>
    );
  }

  if (!stats) {
    return (
      <div className="mb-6 h-16 animate-pulse rounded-xl bg-slate-100" />
    );
  }

  return (
    <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <Card
        label="Active programs"
        value={`${stats.programs_active}/${stats.programs_total}`}
        href="/programs"
      />
      <Card
        label="Active med lines"
        value={String(stats.med_lines_active)}
        href="/programs"
      />
      <Card
        label="In review"
        value={String(stats.refills_in_review)}
        href="/refills?status=in_review"
        highlight={stats.refills_in_review > 0}
      />
      <Card
        label="Safety flags"
        value={safetyFlagged == null ? '…' : String(safetyFlagged)}
        href="/refills/safety"
        highlight={!!safetyFlagged && safetyFlagged > 0}
        danger={!!safetyFlagged && safetyFlagged > 0}
      />
      <Card
        label={`Approved ${stats.period}`}
        value={`${Math.round(stats.approved_this_month_egp).toLocaleString('en-EG')} EGP`}
        href="/reports"
      />
    </div>
  );
}

function Card({
  label,
  value,
  href,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  href: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border bg-white p-3 shadow-sm hover:border-blue-300 transition ${
        danger
          ? 'border-red-300 bg-red-50'
          : highlight
            ? 'border-amber-300 bg-amber-50'
            : ''
      }`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${
          danger ? 'text-red-800' : ''
        }`}
      >
        {value}
      </div>
    </Link>
  );
}
