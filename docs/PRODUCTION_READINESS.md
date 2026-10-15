# Production readiness assessment

**Date:** 2026-10-15  
**App:** https://medical-aid-automation.vercel.app/  
**Stack:** Next.js 14 · Vercel · Neon Postgres · Neon Auth (Google) · WhatsApp optional

## Verdict

**Yes — production-grade for the core chronic medicine support workflow**, with a short list of hardening items before multi-tenant scale.

| Area | Grade | Notes |
|------|-------|--------|
| Public intake + status | A | Live, bilingual, draft save, Egyptian catalog |
| Employee self-service `/me` | A | Roster + prior regimens + 2027 renew prefill |
| Ops path (queue → programs) | A- | Auth, roles, auto-enroll, claims drafts |
| Data store (Neon) | A | 25k Egyptian drugs, 258 programs, formulary |
| Auth model | B+ | Public limited; ops via secret + Google allowlist/roles |
| Multi-tenant orgs | B | Register + org_code scope; isolation for pure org members |
| Observability | B | `/api/health` checks env, neon, catalog, claims |
| WhatsApp | B- | Integrated; provider mode often `none` until credentials |
| Feature flags | A | WHO / AI coach default OFF until management approval |
| UX / PWA | A- | Mobile nav, guide, glass UI, searchable pickers |

## Live health snapshot (2026-10-15)

- `DATABASE_URL` set · Neon connected
- `egyptian_drugs` ≈ 25,065 · formulary ≈ 856
- Programs ≈ 258 · claims present
- Auto-enroll + auto-claim defaults **on**
- Feature flags WHO / AI coach **off** (by design)

## Production checklist

### Already in good shape

- [x] System of record is Neon (not Google Sheets)
- [x] Only intake / status / me / guide public
- [x] Staff middleware + PROCESS_SECRET and/or Google allowlist
- [x] Staff roles (`admin` / `operator` / `viewer`)
- [x] Request status privacy (mask names unless verified)
- [x] Employee profile phone verification
- [x] 2027 renewal prefill + deadline messaging
- [x] Egyptian catalog primary, MSH fallback
- [x] Org registration path + scoped ops for org members
- [x] HTTPS (Vercel) + HSTS

### Recommended before heavy multi-org traffic

- [ ] Backfill `org_code` on historical `aid_requests` from `company`
- [ ] Scope **claims** and **pharmacy** list APIs the same way as intake/programs
- [ ] Org switcher in staff UI when a user belongs to multiple orgs
- [ ] Rate-limit public `POST /api/intake` and lookup APIs
- [ ] Structured audit log (who approved / enrolled / exported)
- [ ] Staging environment + smoke tests on deploy
- [ ] Turn on WhatsApp provider credentials if outreach is required
- [ ] Optional: `ORG_REGISTRATION_MODE=approval` so new orgs need admin OK

### Explicitly optional (management flags)

- WHO needs assessment (`ENABLE_WHO_ASSESSMENT`)
- AI adherence coach (`ENABLE_AI_ADHERENCE_COACH`)

## What “production-grade” means here

The platform is **ready to run real monthly chronic support** for ESP/Armanious and for additional organizations that register, with:

1. Beneficiaries submitting and tracking without accounts  
2. Employees renewing 2027 regimens from profile  
3. Staff processing queue → pharmacy → programs under auth  
4. Catalog and formulary backed by Neon  

It is **not** yet a fully isolated SaaS with per-tenant billing, SSO per org, and complete horizontal row-level security on every table — that is the next maturity step, not a blocker for current operations.
