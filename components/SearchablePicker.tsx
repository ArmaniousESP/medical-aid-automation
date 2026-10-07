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

  const baseList = useMemo(() => {
    const seen = new Set<string>();
    const out: PickerOption[] = [];
    const push = (list: PickerOption[]) => {
      for (const o of list) {
        const k = normalize(o.value);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push(o);
      }
    };
    // Learned first when no/few characters — self-evolution surface
    if (normalize(query).length < 2) {
      push(learned);
      if (loadOptions) push(asyncOpts);
      push(filteredStatic);
    } else {
      if (loadOptions) push(asyncOpts);
      push(learned);
      push(filteredStatic);
    }
    return out.slice(0, 40);
  }, [learned, asyncOpts, filteredStatic, loadOptions, query]);

  const exactMatch = baseList.some(
    (o) =>
      normalize(o.value) === normalize(query) || normalize(o.label) === normalize(query)
  );

  const showCreate = allowCreate && query.trim().length > 0 && !exactMatch;

  const items: Array<PickerOption & { isCreate?: boolean }> = [
    ...baseList,
    ...(showCreate
      ? [{ value: query.trim(), label: createLabel(query.trim()), isCreate: true as const }]
      : []),
  ];

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  function pick(opt: PickerOption) {
    onChange(opt.value);
    setQuery(opt.value);
    setOpen(false);
    if (learnKey) recordLearn(learnKey, opt.value, opt.label);
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
        pick({ value: query.trim(), label: query.trim() });
      }
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
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
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:opacity-50"
      />

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
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
                className={`flex w-full flex-col items-start px-4 py-2.5 text-left text-sm ${
                  i === highlight ? 'bg-emerald-50' : 'hover:bg-slate-50'
                } ${opt.isCreate ? 'text-emerald-800 font-medium border-t border-slate-100' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(opt)}
              >
                <span>{opt.label}</span>
                {opt.sublabel && !opt.isCreate && (
                  <span className="text-[11px] text-slate-500">{opt.sublabel}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
