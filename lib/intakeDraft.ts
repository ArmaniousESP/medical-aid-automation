/** Browser-only helpers for intake continuity (no PII sent to server). */

export const INTAKE_DRAFT_KEY = 'maa_intake_draft_v1';
export const INTAKE_PROFILE_KEY = 'maa_intake_profile_v1';
export const INTAKE_LAST_ID_KEY = 'maa_intake_last_id';

export type IntakeDraft = {
  emp_name: string;
  emp_id: string;
  company: string;
  phone: string;
  patient_name: string;
  relation: string;
  city: string;
  comments: string;
  roshetta: string;
  meds: { name: string; qty: number }[];
  savedAt: number;
};

export type IntakeProfile = {
  emp_name: string;
  emp_id: string;
  company: string;
  phone: string;
  city: string;
};

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function loadDraft(): IntakeDraft | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(INTAKE_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as IntakeDraft;
    if (!d || typeof d !== 'object') return null;
    // Expire after 7 days
    if (d.savedAt && Date.now() - d.savedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(INTAKE_DRAFT_KEY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Omit<IntakeDraft, 'savedAt'>) {
  if (!canUseStorage()) return;
  try {
    const payload: IntakeDraft = { ...draft, savedAt: Date.now() };
    localStorage.setItem(INTAKE_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearDraft() {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(INTAKE_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function loadProfile(): IntakeProfile | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(INTAKE_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as IntakeProfile;
  } catch {
    return null;
  }
}

export function saveProfile(p: IntakeProfile) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(INTAKE_PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function saveLastRequestId(id: string) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(INTAKE_LAST_ID_KEY, id);
  } catch {
    /* ignore */
  }
}

export function loadLastRequestId(): string | null {
  if (!canUseStorage()) return null;
  try {
    return localStorage.getItem(INTAKE_LAST_ID_KEY);
  } catch {
    return null;
  }
}

const RECENT_PREFIX = 'maa_recent_';

export function pushRecent(key: string, value: string, limit = 8) {
  if (!canUseStorage() || !value.trim()) return;
  try {
    const k = RECENT_PREFIX + key;
    const prev: string[] = JSON.parse(localStorage.getItem(k) || '[]');
    const next = [value.trim(), ...prev.filter((v) => v.toLowerCase() !== value.trim().toLowerCase())].slice(
      0,
      limit
    );
    localStorage.setItem(k, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function loadRecent(key: string): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(RECENT_PREFIX + key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
