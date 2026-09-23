type Factor = { name: string; score: number; weight: number; note?: string };

export type ConfidenceDetail = {
  score: number;
  band: 'auto' | 'review' | 'manual' | string;
  factors?: Factor[];
  summary?: string;
  auto_threshold?: number;
  review_threshold?: number;
};

const bandStyles: Record<string, string> = {
  auto: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  review: 'bg-amber-100 text-amber-900 border-amber-300',
  manual: 'bg-red-100 text-red-900 border-red-300',
};

export function ConfidenceBadge({
  detail,
  compact = false,
}: {
  detail: ConfidenceDetail | null | undefined;
  compact?: boolean;
}) {
  if (!detail) return null;
  const style = bandStyles[detail.band] || bandStyles.manual;
  const pct = Math.round((detail.score || 0) * 100);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${style}`}
      >
        {pct}% · {detail.band}
      </span>
    );
  }

  return (
    <div className={`rounded-lg border p-3 text-xs space-y-2 ${style}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wide">
          Confidence · {detail.band}
        </span>
        <span className="text-lg font-bold tabular-nums">{pct}%</span>
      </div>
      {detail.summary && <p className="opacity-90">{detail.summary}</p>}
      {detail.factors && detail.factors.length > 0 && (
        <ul className="space-y-1 border-t border-black/10 pt-2">
          {detail.factors.map((f) => (
            <li key={f.name} className="flex justify-between gap-2">
              <span>
                {f.name}
                {f.note ? (
                  <span className="opacity-70"> — {f.note}</span>
                ) : null}
              </span>
              <span className="tabular-nums font-medium">
                {Math.round(f.score * 100)}%
                <span className="opacity-60 text-[10px]"> ×{f.weight}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {(detail.auto_threshold != null || detail.review_threshold != null) && (
        <p className="text-[10px] opacity-70">
          Auto ≥ {Math.round((detail.auto_threshold ?? 0.85) * 100)}% · Review ≥{' '}
          {Math.round((detail.review_threshold ?? 0.7) * 100)}%
        </p>
      )}
    </div>
  );
}
