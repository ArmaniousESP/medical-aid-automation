# Production readiness assessment

**Date:** 2026-10-15  
**App:** https://medical-aid-automation.vercel.app/

## Verdict

**Production-grade for core chronic medicine support**, with multi-org isolation and abuse protections in place.

## Hardening completed (this pass)

- [x] **Claims list scoped** by `org_codes` / `org_ids` (join aid_requests + programs)
- [x] **Pharmacy pick-list** requires ops auth + scoped by `employees.org_id`
- [x] **Rate limits** on public intake (`submit` 20/min, search/estimate 60/min) and request-status (60/min)
- [x] **Org backfill API** `POST /api/admin/org-backfill` (ops only)
- [x] **Smoke workflow** `.github/workflows/smoke.yml` (health + public pages every 6h)
- [x] Staff session exposes `org_scope` + memberships; org members can Activate without allowlist

## Still recommended

- [ ] Register real org rows (Armanious, Eva Pharma, تجميل) so backfill maps company → org_code
- [ ] Run `POST /api/admin/org-backfill` after orgs exist
- [ ] Optional `ORG_REGISTRATION_MODE=approval`
- [ ] Staging environment
- [ ] WhatsApp provider credentials if outreach is required
- [ ] Structured audit log for approvals

## Live health

See `GET /api/health` — DATABASE_URL, Neon programs, egyptian catalog, formulary, claims.
