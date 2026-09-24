# Authentication strategy

## Goals

| Audience | Access |
|----------|--------|
| Public | Submit request (`/intake`), check status by ID (`/request-status`) |
| Ops staff | Programs, claims, pharmacy, full lists, process APIs |

Patient data must **not** be publicly listable.

---

## Phase 1 — current (shipped)

**Shared ops secret(s)** via `PROCESS_SECRET`.

```bash
# Single staff password
PROCESS_SECRET=your-long-random-string

# Multiple staff passwords (comma-separated)
PROCESS_SECRET=alice-secret,bob-secret
```

- Middleware blocks all non-public routes without a matching cookie/header.
- Home → **Unlock ops** sets httpOnly cookie `maa_admin` (12h).
- APIs accept `x-process-secret`, `Authorization: Bearer`, or `?secret=`.
- If `PROCESS_SECRET` is unset, ops stay **locked**.

**Public paths:** `/`, `/intake`, `/request-status`, `/guide`, `/status`,  
`POST /api/intake` (submit/search/estimate), `GET /api/request-status`, `/api/health`, `/api/auth/*`.

---

## Phase 2 — recommended upgrade

Named staff accounts with **Auth.js** or **Neon Auth**, still keeping intake/status public.

| Option | Why |
|--------|-----|
| Auth.js + Neon | Users in your DB, free, full control |
| Neon Auth | Managed Better Auth in `neon_auth` schema |
| Clerk | Polished UI / orgs / SSO when needed |

**Avoid while on Neon:** Supabase Auth (would split identity into another Postgres).

### Staff-only rules

- Disable open sign-up
- Allowlist `@yourorg.org` or invite-only
- Roles later: `ops` · `pharmacy` · `finance`

---

## Phase 3 — optional

- SSO (WorkOS / Auth0) for corporate IdP
- Per-action audit log (`unlocked_by`, `approved_by`)

---

## What not to do

- Do not require login for beneficiaries to submit or check status by Request ID
- Do not leave ops open when `PROCESS_SECRET` is empty
- Do not put full patient lists on a public URL
