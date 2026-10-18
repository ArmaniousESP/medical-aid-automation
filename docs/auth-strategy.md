# Authentication strategy

## Goals

| Audience | Access |
|----------|--------|
| Public | Submit (`/intake`), status by ID (`/request-status`) — **no account** |
| Employees | Profile gate (`/me`) via company + employee ID + phone |
| Ops staff / org operators | Programs, claims, pharmacy, process APIs |

Patient data must **not** be publicly listable. See [schema/006_identity_data_flow.md](./schema/006_identity_data_flow.md).

---

## Phase 1 — shared ops secret (still supported)

**`PROCESS_SECRET`** — emergency / bootstrap unlock.

```bash
PROCESS_SECRET=your-long-random-string
# or multiple: alice-secret,bob-secret
```

- Middleware blocks non-public routes without cookie/header.
- Home → **Unlock ops** sets httpOnly `maa_admin` (12h).
- APIs accept `x-process-secret`, `Authorization: Bearer`, or `?secret=`.

---

## Phase 2 — current recommended (shipped)

**Neon Auth + Google** for staff and org operators.

| Piece | Role |
|-------|------|
| `NEON_AUTH_*` + Google OAuth | Identity |
| `OPS_ALLOWED_EMAILS` / `OPS_ADMIN_EMAILS` | Platform staff allowlist |
| `org_members` | Per-org operators (invite from Admin) |
| `maa_ops_staff` HMAC cookie | Middleware + API authorization |
| `staff_roles` | admin · operator · viewer |

Flow: `/sign-in` → Google → `/sign-in/callback` → `POST /api/auth/staff-session` → ops pages.

**Public paths stay open:** `/`, `/intake`, `/request-status`, `/me`, `/guide`, `/status`, `/org/register`, `POST /api/intake`, `GET /api/request-status`, `/api/health`, `/api/auth/*`, `/api/employee/*` (verify triple).

---

## Phase 3 — optional

- SSO (WorkOS / Auth0) for corporate IdP
- Stronger employee OTP via WhatsApp (still no full account required)
- Row-level security policies in Neon for defense in depth

---

## What not to do

- Do not require login for beneficiaries to submit or check status by Request ID
- Do not leave ops open when neither `PROCESS_SECRET` nor Neon staff session is set
- Do not put full patient lists on a public URL
- Do not split identity into a second product database (keep Neon system of record)
