# Neon Auth + Google for staff access

Public pages stay open: `/intake`, `/request-status`, `/guide`, `/status`, Home.

Ops pages require **either**:

1. **Google (Neon Auth)** — allowlisted email → signed cookie `maa_ops_staff`
2. **PROCESS_SECRET** — legacy unlock cookie `maa_admin`

## 1. Enable Neon Auth

1. [Neon Console](https://console.neon.tech) → your project → branch → **Auth** → Enable
2. Copy **Auth base URL** (looks like `https://ep-….neonauth….neon.tech/neondb/auth`)
3. Enable **Google** OAuth (shared dev credentials, or your Google Client ID/Secret for production)

Redirect URI for Google (from Neon docs):

```text
{NEON_AUTH_BASE_URL}/callback/google
```

## 2. Vercel environment variables

| Variable | Example |
|----------|---------|
| `NEON_AUTH_BASE_URL` | Auth URL from Neon |
| `NEXT_PUBLIC_NEON_AUTH_URL` | **Same** as base URL (browser client) |
| `NEON_AUTH_COOKIE_SECRET` | `openssl rand -base64 32` (≥32 chars) |
| `OPS_ALLOWED_EMAILS` | `you@org.com,colleague@org.com` |
| `PROCESS_SECRET` | Optional fallback secret unlock |

Redeploy after saving.

## 3. Staff flow

1. Open https://medical-aid-automation.vercel.app/sign-in
2. **Continue with Google**
3. Callback mints `maa_ops_staff` if email ∈ `OPS_ALLOWED_EMAILS`
4. Ops nav works (Queue → Claims → …)

## 4. APIs

- `GET/POST /api/auth/*` — Neon Auth proxy (except `/api/auth/unlock`)
- `POST /api/auth/staff-session` — mint staff cookie after Google session
- `DELETE /api/auth/staff-session` — clear staff cookie
- `POST /api/auth/unlock` — PROCESS_SECRET still works

## 5. Security notes

- Beneficiaries never use Google staff sign-in
- Empty `OPS_ALLOWED_EMAILS` → no Google user gets ops (deny by default)
- Keep production Google OAuth on your own Client ID (Neon shared keys are for dev only)
