/**
 * Optional DHIS2 Tracker bridge (national / MOH HMIS reporting).
 * Neon remains system of record — DHIS2 only receives mapped enrollments/events
 * when credentials + program UIDs are configured.
 *
 * Auth (pick one):
 *   DHIS2_PAT          — Personal Access Token → Authorization: ApiToken <token>
 *   DHIS2_USERNAME + DHIS2_PASSWORD — Basic auth
 *
 * Required for push:
 *   DHIS2_BASE_URL           e.g. https://play.im.dhis2.org/stable
 *   DHIS2_ORG_UNIT           organisation unit UID
 *   DHIS2_PROGRAM            tracker program UID
 *   DHIS2_TRACKED_ENTITY_TYPE
 *
 * Optional attribute UIDs (TEI attributes):
 *   DHIS2_ATTR_EMP_ID, DHIS2_ATTR_PATIENT_NAME, DHIS2_ATTR_PHONE,
 *   DHIS2_ATTR_COMPANY, DHIS2_ATTR_REQUEST_ID
 *
 * Optional program stage for dispense events:
 *   DHIS2_STAGE_DISPENSE
 *
 * Feature flags (default OFF):
 *   DHIS2_SYNC_ON_ENROLL=1
 *   DHIS2_SYNC_ON_DISPENSE=1
 *   DHIS2_DRY_RUN=1 — log payload, do not POST
 */

import { fetchWithRetry, webhookRetryDefaults } from '@/lib/httpRetry';

function baseUrl(): string {
  const u = (process.env.DHIS2_BASE_URL || '').trim().replace(/\/$/, '');
  return u;
}

export function dhis2Configured(): boolean {
  if (!baseUrl().startsWith('http')) return false;
  const pat = process.env.DHIS2_PAT?.trim();
  if (pat) return true;
  return !!(process.env.DHIS2_USERNAME?.trim() && process.env.DHIS2_PASSWORD);
}

export function dhis2PushReady(): boolean {
  return (
    dhis2Configured() &&
    !!process.env.DHIS2_ORG_UNIT?.trim() &&
    !!process.env.DHIS2_PROGRAM?.trim() &&
    !!process.env.DHIS2_TRACKED_ENTITY_TYPE?.trim()
  );
}

export function dhis2SyncOnEnroll(): boolean {
  return process.env.DHIS2_SYNC_ON_ENROLL === '1' && dhis2PushReady();
}

export function dhis2SyncOnDispense(): boolean {
  return process.env.DHIS2_SYNC_ON_DISPENSE === '1' && dhis2PushReady();
}

export function dhis2DryRun(): boolean {
  return process.env.DHIS2_DRY_RUN === '1';
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const pat = process.env.DHIS2_PAT?.trim();
  if (pat) {
    headers.Authorization = `ApiToken ${pat}`;
    return headers;
  }
  const user = process.env.DHIS2_USERNAME?.trim();
  const pass = process.env.DHIS2_PASSWORD || '';
  if (user) {
    headers.Authorization =
      'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  }
  return headers;
}

async function dhis2Fetch(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: unknown; error?: string }> {
  if (!dhis2Configured()) {
    return { ok: false, status: 0, data: null, error: 'DHIS2 not configured' };
  }
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const retry = webhookRetryDefaults();
  try {
    const { response, attempts, errors } = await fetchWithRetry(
      url,
      {
        ...init,
        headers: {
          ...authHeaders(),
          ...(init?.headers as Record<string, string> | undefined),
        },
      },
      retry
    );
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 500) };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data,
        error:
          errors.join('; ') ||
          `HTTP ${response.status} after ${attempts} attempts`,
      };
    }
    return { ok: true, status: response.status, data };
  } catch (e: unknown) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: e instanceof Error ? e.message : 'dhis2 fetch failed',
    };
  }
}

export async function dhis2Ping(): Promise<{
  ok: boolean;
  version?: string;
  systemName?: string;
  error?: string;
}> {
  const r = await dhis2Fetch('/api/system/info');
  if (!r.ok) return { ok: false, error: r.error };
  const d = r.data as { version?: string; systemName?: string } | null;
  return {
    ok: true,
    version: d?.version,
    systemName: d?.systemName,
  };
}

export type Dhis2ProgramPayload = {
  program_id: string;
  program_code?: string;
  emp_name?: string;
  emp_id?: string;
  patient_name?: string;
  phone?: string;
  company?: string;
  request_id?: string;
  enrolled_at?: string; // ISO date
};

function teiAttributes(p: Dhis2ProgramPayload): { attribute: string; value: string }[] {
  const attrs: { attribute: string; value: string }[] = [];
  const map: [string | undefined, string | undefined][] = [
    [process.env.DHIS2_ATTR_EMP_ID, p.emp_id],
    [process.env.DHIS2_ATTR_PATIENT_NAME, p.patient_name || p.emp_name],
    [process.env.DHIS2_ATTR_PHONE, p.phone],
    [process.env.DHIS2_ATTR_COMPANY, p.company],
    [process.env.DHIS2_ATTR_REQUEST_ID, p.request_id],
  ];
  for (const [uid, val] of map) {
    if (uid?.trim() && val && String(val).trim()) {
      attrs.push({ attribute: uid.trim(), value: String(val).trim() });
    }
  }
  return attrs;
}

function todayIsoDate(iso?: string): string {
  if (iso && /^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build tracker import body: TEI + enrollment (ACTIVE).
 * Does not invent attribute UIDs — only those configured in env are sent.
 */
export function buildEnrollmentTrackerBody(p: Dhis2ProgramPayload) {
  const orgUnit = process.env.DHIS2_ORG_UNIT!.trim();
  const program = process.env.DHIS2_PROGRAM!.trim();
  const tet = process.env.DHIS2_TRACKED_ENTITY_TYPE!.trim();
  const enrolledAt = todayIsoDate(p.enrolled_at);
  const attributes = teiAttributes(p);

  return {
    trackedEntities: [
      {
        orgUnit,
        trackedEntityType: tet,
        attributes,
        enrollments: [
          {
            orgUnit,
            program,
            status: 'ACTIVE',
            enrolledAt,
            occurredAt: enrolledAt,
            attributes,
          },
        ],
      },
    ],
  };
}

export type Dhis2DispensePayload = Dhis2ProgramPayload & {
  med_summary?: string;
  period?: string;
};

export function buildDispenseEventBody(p: Dhis2DispensePayload) {
  const orgUnit = process.env.DHIS2_ORG_UNIT!.trim();
  const program = process.env.DHIS2_PROGRAM!.trim();
  const stage = process.env.DHIS2_STAGE_DISPENSE?.trim();
  if (!stage) return null;
  const occurredAt = todayIsoDate();
  const dataValues: { dataElement: string; value: string }[] = [];
  const deMed = process.env.DHIS2_DE_MED_SUMMARY?.trim();
  const dePeriod = process.env.DHIS2_DE_PERIOD?.trim();
  if (deMed && p.med_summary) dataValues.push({ dataElement: deMed, value: p.med_summary });
  if (dePeriod && p.period) dataValues.push({ dataElement: dePeriod, value: p.period });

  return {
    events: [
      {
        orgUnit,
        program,
        programStage: stage,
        status: 'COMPLETED',
        occurredAt,
        dataValues,
      },
    ],
  };
}

export async function pushTrackerImport(body: unknown): Promise<{
  ok: boolean;
  dry_run?: boolean;
  data?: unknown;
  error?: string;
}> {
  if (!dhis2PushReady()) {
    return {
      ok: false,
      error:
        'DHIS2 push not ready — need BASE_URL, auth, ORG_UNIT, PROGRAM, TRACKED_ENTITY_TYPE',
    };
  }
  if (dhis2DryRun()) {
    return { ok: true, dry_run: true, data: { would_post: body } };
  }
  const r = await dhis2Fetch('/api/tracker?async=false',
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
  if (!r.ok) return { ok: false, error: r.error, data: r.data };
  return { ok: true, data: r.data };
}

export async function syncProgramEnrollmentToDhis2(
  p: Dhis2ProgramPayload
): Promise<{ attempted: boolean; ok?: boolean; dry_run?: boolean; error?: string }> {
  if (!dhis2SyncOnEnroll()) return { attempted: false };
  const body = buildEnrollmentTrackerBody(p);
  const r = await pushTrackerImport(body);
  return {
    attempted: true,
    ok: r.ok,
    dry_run: r.dry_run,
    error: r.error,
  };
}

export async function syncDispenseToDhis2(
  p: Dhis2DispensePayload
): Promise<{ attempted: boolean; ok?: boolean; dry_run?: boolean; error?: string }> {
  if (!dhis2SyncOnDispense()) return { attempted: false };
  const body = buildDispenseEventBody(p);
  if (!body) {
    return {
      attempted: true,
      ok: false,
      error: 'DHIS2_STAGE_DISPENSE not set',
    };
  }
  const r = await pushTrackerImport(body);
  return {
    attempted: true,
    ok: r.ok,
    dry_run: r.dry_run,
    error: r.error,
  };
}

export function dhis2ConfigStatus() {
  return {
    configured: dhis2Configured(),
    push_ready: dhis2PushReady(),
    sync_on_enroll: process.env.DHIS2_SYNC_ON_ENROLL === '1',
    sync_on_dispense: process.env.DHIS2_SYNC_ON_DISPENSE === '1',
    dry_run: dhis2DryRun(),
    base_url_set: !!baseUrl(),
    auth: process.env.DHIS2_PAT?.trim()
      ? 'pat'
      : process.env.DHIS2_USERNAME?.trim()
        ? 'basic'
        : 'none',
    org_unit_set: !!process.env.DHIS2_ORG_UNIT?.trim(),
    program_set: !!process.env.DHIS2_PROGRAM?.trim(),
    tet_set: !!process.env.DHIS2_TRACKED_ENTITY_TYPE?.trim(),
    stage_dispense_set: !!process.env.DHIS2_STAGE_DISPENSE?.trim(),
  };
}
