'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

export type PickerOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options?: PickerOption[];
  loadOptions?: (query: string) => Promise<PickerOption[]>;
  /** When set, selections are recorded and popular values rank higher over time. */
  learnKey?: string;
  allowCreate?: boolean;
  createLabel?: (query: string) => string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  emptyHint?: string;
  minQueryLength?: number;
};

type ListItem = PickerOption & {
  isCreate?: boolean;
  isLearned?: boolean;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function recordLearn(key: string, value: string, label?: string) {
  if (!key || !value.trim()) return;
  void fetch('/api/learning', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: value.trim(), label }),
    keepalive: true,
  }).catch(() => {});
}

/**
 * Combobox: search a known list, learn from usage, or add a custom value.
 */
export function SearchablePicker({
  value,
  onChange,
  options = [],
  loadOptions,
  learnKey,
  allowCreate = true,
  createLabel = (q) => `Add “${q}” · إضافة`,
  placeholder = 'Search or type…',
  required,
  disabled,
  name,
  id: idProp,
  className = '',
  emptyHint = 'No matches',
  minQueryLength = 0,
}: Props) {
  const autoId = useId();
  const id = idProp || autoId;
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [asyncOpts, setAsyncOpts] = useState<PickerOption[]>([]);
  const [learned, setLearned] = useState<PickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimer = useRef<number | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    };
  }, []);

  function flashFeedback(msg: string) {
    setFeedback(msg);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 2200);
  }

  const fetchLearned = useCallback(
    async (q: string) => {
      if (!learnKey) return;
      try {
        const p = new URLSearchParams({
          key: learnKey,
          limit: '10',
        });
        if (q.trim()) p.set('q', q.trim());
        const res = await fetch(`/api/learning?${p}`);
        const data = await res.json();
        setLearned(
          (data.items || []).map((it: PickerOption) => ({
            value: it.value,
            label: it.label || it.value,
            sublabel: it.sublabel,
          }))
        );
      } catch {
        setLearned([]);
      }
    },
    [learnKey]
  );

  const runLoad = useCallback(
    async (q: string) => {
      if (!loadOptions) return;
      if (q.trim().length < minQueryLength) {
        setAsyncOpts([]);
        return;
      }
      setLoading(true);
      try {
        const items = await loadOptions(q);
        setAsyncOpts(items || []);
      } catch {
        setAsyncOpts([]);
      } finally {
        setLoading(false);
      }
    },
    [loadOptions, minQueryLength]
  );

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void fetchLearned(query);
      if (loadOptions) void runLoad(query);
    }, 200);
    return () => window.clearTimeout(t);
  }, [query, open, loadOptions, runLoad, fetchLearned]);

  const filteredStatic = useMemo(() => {
    const q = normalize(query);
    if (!q) return options.slice(0, 40);
    return options
      .filter(
        (o) =>
          normalize(o.label).includes(q) ||
          normalize(o.value).includes(q) ||
          (o.sublabel && normalize(o.sublabel).includes(q))
      )
      .slice(0, 40);
  }, [options, query]);

  const learnedKeys = useMemo(
    () => new Set(learned.map((o) => normalize(o.value))),
    [learned]
  );

  const baseList = useMemo(() => {
    const seen = new Set<string>();
    const out: ListItem[] = [];
    const push = (list: PickerOption[], markLearned: boolean) => {
      for (const o of list) {
        const k = normalize(o.value);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push({
          ...o,
          isLearned: markLearned || learnedKeys.has(k),
        });
      }
    };
    if (normalize(query).length < 2) {
      push(learned, true);
      if (loadOptions) push(asyncOpts, false);
      push(filteredStatic, false);
    } else {
      if (loadOptions) push(asyncOpts, false);
      push(learned, true);
      push(filteredStatic, false);
    }
    return out.slice(0, 40);
  }, [learned, asyncOpts, filteredStatic, loadOptions, query, learnedKeys]);

  const exactMatch = baseList.some(
    (o) =>
      normalize(o.value) === normalize(query) || normalize(o.label) === normalize(query)
  );

  const showCreate = allowCreate && query.trim().length > 0 && !exactMatch;
  const popularCount = baseList.filter((o) => o.isLearned).length;

  const items: ListItem[] = [
    ...baseList,
    ...(showCreate
      ? [
          {
            value: query.trim(),
            label: createLabel(query.trim()),
            isCreate: true as const,
          },
        ]
      : []),
  ];

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  function pick(opt: PickerOption & { isCreate?: boolean; isLearned?: boolean }) {
    onChange(opt.value);
    setQuery(opt.value);
    setOpen(false);
    if (learnKey) {
      recordLearn(learnKey, opt.value, opt.label);
      if (opt.isCreate) {
        flashFeedback('New value remembered · قيمة جديدة');
      } else if (opt.isLearned) {
        flashFeedback('Popular choice · اختيار شائع');
      } else {
        flashFeedback('Remembered for next time · تم الحفظ');
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      setOpen(false);
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[highlight];
      if (item) pick(item);
      else if (allowCreate && query.trim()) {
        pick({ value: query.trim(), label: query.trim(), isCreate: true });
      }
    }
  }

  const inputRing =
    learnKey && popularCount > 0 && open
      ? 'focus:border-violet-500 focus:ring-violet-200'
      : 'focus:border-emerald-500 focus:ring-emerald-200';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          required={required}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (allowCreate) onChange(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none focus:ring-2 disabled:opacity-50 ${inputRing} ${
            learnKey ? 'pr-11' : ''
          }`}
        />
        {learnKey && (
          <span
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm transition ${
              popularCount > 0
                ? 'text-violet-600'
                : feedback
                  ? 'text-emerald-600'
                  : 'text-slate-300'
            }`}
            title="Learns from your choices"
            aria-hidden
          >
            ✦
          </span>
        )}
      </div>

      {feedback && (
        <p
          className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 animate-[fadeIn_0.2s_ease]"
          role="status"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px]">
            ✓
          </span>
          {feedback}
        </p>
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {learnKey && popularCount > 0 && normalize(query).length < 2 && (
            <li className="sticky top-0 z-10 border-b border-violet-100 bg-violet-50/95 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
              Popular from past use · من الاستخدام
              <span className="ml-1 font-normal normal-case text-violet-600">
                ({popularCount})
              </span>
            </li>
          )}
          {loading && (
            <li className="px-4 py-2 text-xs text-slate-500">Searching…</li>
          )}
          {!loading && items.length === 0 && (
            <li className="px-4 py-2 text-xs text-slate-500">{emptyHint}</li>
          )}
          {items.map((opt, i) => (
            <li
              key={`${opt.value}-${opt.isCreate ? 'new' : i}`}
              role="option"
              aria-selected={i === highlight}
            >
              <button
                type="button"
                className={`flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm ${
                  i === highlight ? 'bg-emerald-50' : 'hover:bg-slate-50'
                } ${opt.isCreate ? 'text-emerald-800 font-medium border-t border-slate-100' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(opt)}
              >
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{opt.label}</span>
                  {opt.sublabel && !opt.isCreate && (
                    <span className="block text-[11px] text-slate-500 truncate">
                      {opt.sublabel}
                    </span>
                  )}
                </span>
                {opt.isLearned && !opt.isCreate && (
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                    Popular
                  </span>
                )}
                {opt.isCreate && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    New
                  </span>
                )}
              </button>
            </li>
          ))}
          {learnKey && !loading && items.length > 0 && (
            <li className="border-t border-slate-100 px-4 py-1.5 text-[10px] text-slate-400">
              Choices improve suggestions over time · يتحسن الاقتراح مع الوقت
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
