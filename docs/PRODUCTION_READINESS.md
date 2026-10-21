# Production readiness assessment

**Date:** 2026-10-21  
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
- [x] **Org registration** public page + Admin approve/reject flow
- [x] **Smoke workflow** health + public pages (every 6h + push)
- [x] **Expanded smoke** — search_med, estimate, status shape, anon 401
- [x] Staff session `org_scope` + memberships
- [x] **Aida identity UX** — cream paper, forest green, serif titles on public surfaces
- [x] **Three-door model** documented (`docs/schema/006_identity_data_flow.md`): public / employee / staff
- [x] **Employee portal** privacy gate + staff message reply threads
- [x] **Request status** optional verification unlocks full names; others masked; **Share / Copy link**
- [x] **Org register** data-boundary copy + multi-tenant isolation messaging
- [x] **Staff sign-in** three-doors map + Google CTA (when Neon Auth configured)
- [x] **Health checks** for Neon Auth + staff access (`/api/health`)
- [x] **Intake cost estimate** from Egyptian catalog (~25k meds) + price disclaimer
- [x] **Intake drafts** auto-save, last-request link, renew prefill
- [x] **Admin access card** shows Google vs PROCESS_SECRET readiness
- [x] **Home** surfaces estimate + share hints
- [x] **Guide** covers estimate, share, and staff path

## Optional next

- [ ] Set `NEON_AUTH_BASE_URL` + `OPS_ALLOWED_EMAILS` + `NEON_AUTH_COOKIE_SECRET` for Google staff (see `docs/NEON_AUTH.md`)
- [ ] Set `ORG_REGISTRATION_MODE=approval` when open registration should require review
- [ ] Staging environment (Vercel Preview + Neon branch) — see `docs/STAGING.md`
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
| Staff Google setup | `docs/NEON_AUTH.md` |
| Staging setup | `docs/STAGING.md` |
