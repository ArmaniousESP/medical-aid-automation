# Production readiness assessment

**Date:** 2026-10-15  
**App:** https://medical-aid-automation.vercel.app/

## Verdict

**Production-grade for core chronic medicine support**, with multi-org isolation, audit trail, and abuse protections.

## Hardening completed

- [x] **Claims list scoped** by org
- [x] **Pharmacy pick-list** requires ops auth + org scope
- [x] **Rate limits** on public intake and request-status
- [x] **Org backfill** API + seeded orgs (`ARMANIOUS`, `EVA`, `TAGMEEL`, `DEFAULT`)
- [x] Company → org matching via code / name / `settings.aliases`
- [x] **Audit events** (intake, enroll, claim, pharmacy, org approval)
- [x] **Admin audit panel** with action + org filters
- [x] **Org registration** public page + Admin approve/reject queue
- [x] **Smoke workflow** health + public pages
- [x] Staff session `org_scope` + memberships

## Optional next

- [ ] Set `ORG_REGISTRATION_MODE=approval` when open registration should require review
- [ ] Staging environment (Vercel Preview + Neon branch)
- [ ] Live WhatsApp credentials (Meta or Twilio) when outreach goes live
- [ ] Expand smoke tests to authenticated ops paths
- [ ] Row-level Neon policies if multi-tenant strictness is required beyond app filters

## Multi-org quick reference

| Surface | Path |
|---------|------|
| Register org | `/org/register` |
| Pending requests | Admin → Organization requests |
| Active orgs | Admin → Organizations |
| Audit | Admin → Audit log |
| Env gate | `ORG_REGISTRATION_MODE=approval` |

## Live health

`GET /api/health` — DATABASE_URL, programs, Egyptian catalog, formulary, claims.
