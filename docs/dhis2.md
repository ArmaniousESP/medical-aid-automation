# DHIS2 integration (optional)

Medical Aid keeps **Neon Postgres as the system of record**. DHIS2 is an optional outbound bridge for national / MOH HMIS reporting (Tracker programs).

Same philosophy as Bitrix: office/HMIS systems are *consumers*; they do not own intake, claims, or pharmacy workflows.

## What is mapped

| Platform | DHIS2 Tracker |
|----------|----------------|
| Chronic program enrollment | Tracked Entity + Enrollment (`ACTIVE`) |
| Monthly dispense / refill (optional) | Event on program stage `DHIS2_STAGE_DISPENSE` |

No PHI is invented for DHIS2 metadata. Only attributes whose **UIDs you configure** are sent.

## Environment variables

### Connection

| Variable | Required | Notes |
|----------|----------|--------|
| `DHIS2_BASE_URL` | yes | e.g. `https://your-instance.org` (no trailing slash) |
| `DHIS2_PAT` | yes* | Personal Access Token → `Authorization: ApiToken …` |
| `DHIS2_USERNAME` / `DHIS2_PASSWORD` | yes* | Alternative to PAT (Basic auth) |

\* One of PAT or username/password.

### Tracker metadata UIDs (from your DHIS2 program design)

| Variable | Required for push |
|----------|-------------------|
| `DHIS2_ORG_UNIT` | yes |
| `DHIS2_PROGRAM` | yes |
| `DHIS2_TRACKED_ENTITY_TYPE` | yes |
| `DHIS2_STAGE_DISPENSE` | only for dispense events |

### Optional TEI attributes

| Variable | Maps from |
|----------|-----------|
| `DHIS2_ATTR_EMP_ID` | employee ID |
| `DHIS2_ATTR_PATIENT_NAME` | patient name |
| `DHIS2_ATTR_PHONE` | phone |
| `DHIS2_ATTR_COMPANY` | company |
| `DHIS2_ATTR_REQUEST_ID` | platform request UUID |

### Optional data elements (dispense stage)

| Variable | Maps from |
|----------|-----------|
| `DHIS2_DE_MED_SUMMARY` | short medicine summary string |
| `DHIS2_DE_PERIOD` | `YYYY-MM` refill period |

### Feature flags (default **off**)

| Variable | Effect |
|----------|--------|
| `DHIS2_SYNC_ON_ENROLL=1` | After successful chronic enroll, push TEI+enrollment |
| `DHIS2_SYNC_ON_DISPENSE=1` | After dispense, push stage event |
| `DHIS2_DRY_RUN=1` | Build payload but **do not** POST to DHIS2 |

## API

Staff / ops only (same gate as other ops routes).

```http
GET  /api/dhis2              → config status
GET  /api/dhis2?ping=1       → config + live /api/system/info
POST /api/dhis2              body { "action": "ping" }
POST /api/dhis2              body { "action": "dry_enrollment", "payload": { … } }
POST /api/dhis2              body { "action": "push_enrollment", "payload": { … } }
```

## Setup checklist

1. In DHIS2: create (or reuse) a **Tracker program** for chronic medicine support.
2. Note UIDs: org unit, program, tracked entity type, attributes, dispense stage.
3. Create a **Personal Access Token** for a service user with capture rights on that org unit.
4. Set env vars on Vercel (Production + Preview if needed).
5. Deploy → open `/api/dhis2?ping=1` with staff session.
6. `POST` `dry_enrollment` and confirm payload attribute UIDs.
7. Turn on `DHIS2_DRY_RUN=1` + `DHIS2_SYNC_ON_ENROLL=1` for a pilot week.
8. Remove dry-run when MOH/HMIS accepts records.

## Security

- Never log full PAT or passwords.
- DHIS2 receives only what you map; keep attribute set minimal.
- Platform public pages never call DHIS2.
- Failures on DHIS2 push are **soft** — enrollment on Neon still succeeds.

## Demo instance

DHIS2 publishes play instances (e.g. `https://play.im.dhis2.org/…`) that reset periodically. Use them only to validate connectivity, not for real patient data.
