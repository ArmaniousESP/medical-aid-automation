# Staging setup (Vercel Preview + Neon)

Use a separate database for previews so production patient data is never touched by experiments.

## 1. Neon branch

1. Open Neon project **lingering-poetry-76698285** (system of record)
2. Create branch e.g. `staging` from `main` / production branch
3. Copy the branch connection string → `DATABASE_URL` for staging only

Optional: run the same seed scripts (roster, regimens, orgs) on the branch if you need realistic data.

## 2. Vercel Preview env

In the Vercel project → Settings → Environment Variables:

| Variable | Production | Preview |
|----------|------------|---------|
| `DATABASE_URL` | production Neon | **staging branch** URL |
| `PROCESS_SECRET` | production secret | different secret |
| `OPS_ALLOWED_EMAILS` / `OPS_ADMIN_EMAILS` | real staff | same or subset |
| WhatsApp keys | live or empty | empty / dry-run only |
| `ORG_REGISTRATION_MODE` | as needed | `approval` recommended |

Leave Preview using GitHub PR deployments — every PR gets a unique URL against the staging DB.

## 3. Smoke against staging

Set GitHub secret `SMOKE_BASE_URL` to a fixed preview URL **only if** you keep a long-lived staging deploy; otherwise keep production as the scheduled smoke target.

## 4. Checklist before promoting to production

- [ ] `GET /api/health` ok on preview
- [ ] Intake submit + status on preview
- [ ] Process-intake dry-run
- [ ] Org register + member invite
- [ ] No production `DATABASE_URL` used in Preview
