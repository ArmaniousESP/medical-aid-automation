# Neon Auth — Google staff sign-in

Staff can unlock ops with **PROCESS_SECRET** (Home unlock) or **Google** via Neon Auth on `/sign-in`.

## Why

- No shared password in day-to-day use
- Allowlisted emails only (`OPS_ALLOWED_EMAILS`)
- Same org-scoped session cookie used by Queue / Claims / Pharmacy

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Required | Example |
|----------|----------|---------|
| `NEON_AUTH_BASE_URL` | Yes for Google | `https://ep-xxx.neonauth.region.aws.neon.tech/neondb/auth` |
| `OPS_ALLOWED_EMAILS` | Yes for Google staff | `you@company.com,ops@company.com` |
| `NEON_AUTH_COOKIE_SECRET` | Recommended | long random string (or falls back to `PROCESS_SECRET`) |
| `PROCESS_SECRET` | Recommended | still useful as emergency unlock |

Also keep:

- `DATABASE_URL` — Neon Postgres
- Optional: `STAFF_ALLOWED_EMAILS` (alias for `OPS_ALLOWED_EMAILS`)

## Setup steps

1. In **Neon Console** → your project → **Auth** (or Branch → Auth):
   - Enable authentication
   - Add **Google** as a provider
   - Copy the **Auth base URL** into `NEON_AUTH_BASE_URL`
2. In **Google Cloud Console** → OAuth client:
   - Authorized redirect URIs must include the Neon Auth callback URL shown in Neon
3. In **Vercel**:
   - Set `NEON_AUTH_BASE_URL`, `OPS_ALLOWED_EMAILS`, `NEON_AUTH_COOKIE_SECRET`
   - Redeploy production
4. Open [https://medical-aid-automation.vercel.app/sign-in](https://medical-aid-automation.vercel.app/sign-in)
   - Use **Continue with Google**
   - Email must appear in `OPS_ALLOWED_EMAILS` (or an org_members / roles row if you use DB roles)

## Verify

```bash
curl -sS https://medical-aid-automation.vercel.app/api/health | jq '.checks.neon_auth, .checks.staff_access'
```

Expect:

- `neon_auth.detail` → `Google sign-in ready · N allowed email(s)`
- `staff_access.ok` → `true`

## Fallback

If Google is not configured yet, staff continue to use **Staff unlock** on Home with `PROCESS_SECRET`.

## Security notes

- Public routes stay public: intake, status, employee profile lookup
- Ops APIs require cookie or `PROCESS_SECRET`
- Do not put `OPS_ALLOWED_EMAILS` in client code; it is server-only
