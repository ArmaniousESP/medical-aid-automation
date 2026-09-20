# Go Live Checklist

Status as of last automation check: **site online, DATABASE_URL still missing on Vercel**.

## 1. Vercel Environment Variables (required)

Project: `medical-aid-automation`  
Path: **Settings → Environment Variables → Production** (+ Preview optional)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon **pooler** connection string (see below) |
| `PROCESS_SECRET` | Any strong random string (`openssl rand -hex 32`) |

### DATABASE_URL (copy)

```
postgresql://neondb_owner:npg_oFv6Mhwb0pHS@ep-still-hall-b20o0qij-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Neon project: `medical-aid-automation` (`lingering-poetry-76698285`)

### Optional (form processing from Google Sheet)

| Variable | Purpose |
|----------|--------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account |
| `GOOGLE_PRIVATE_KEY` | Private key with `\n` |
| `GOOGLE_SHEET_ID` | Spreadsheet id from URL |

Share the sheet with the service account email as **Editor**.

## 2. Redeploy

After saving env vars: **Deployments → ⋮ → Redeploy**

## 3. Verify

```bash
curl -sS https://medical-aid-automation.vercel.app/api/health
```

Expect `ok: true` and `neon.detail` containing `programs=2`.

UI: https://medical-aid-automation.vercel.app/status

## 4. First operational run

1. Open https://medical-aid-automation.vercel.app/
2. Unlock with `PROCESS_SECRET` if set
3. **Process New Responses** (or Dry Run)
4. **مزامنة البرامج** if needed
5. `/programs` — should list chronic programs
6. `/refills` — Generate month → review → approve → dispense

## 5. GitHub (optional)

| Secret | Needed for |
|--------|------------|
| `PROCESS_SECRET` | Same as Vercel — daily process Action |
| `VERCEL_APP_URL` | Optional; defaults to production URL |
| `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` | Optional CLI deploy Action |

Deploy via **Git integration** already runs on every push to `main`.

## Seed data already in Neon

| Program | Employee | Patient | Active meds |
|---------|----------|---------|-------------|
| CHR-2026-11610-01 | سمير مكاري سعد نصرالله | مسعودة سعيد نصرالله | 4 |
| CHR-2026-2187-01 | سراج ثابت يونان زكي | سراج ثابت يونان زكي | 3 |
