# Staging environment

Use a **Vercel Preview** + **Neon branch** before promoting risky changes to production.

## 1. Neon branch

1. Open the Neon console → your project → **Branches**.
2. Create a branch from `main` (e.g. `staging`).
3. Copy the branch connection string (`DATABASE_URL`).

Optional: run the same schema migrations as production on the branch if it is empty.

## 2. Vercel Preview env

1. Vercel → **medical-aid-automation** → **Settings** → **Environment Variables**.
2. Add (or override for **Preview** only):
   - `DATABASE_URL` = Neon **staging** connection string
   - `PROCESS_SECRET` = a **different** secret from production
   - Leave production WhatsApp / live credentials **unset** on Preview unless you intentionally test them
3. Push a branch (or open a PR). Vercel creates a Preview URL automatically.

## 3. Smoke against Preview

Set GitHub secret `SMOKE_BASE_URL` to the Preview URL, or run manually:

```bash
URL=https://your-preview.vercel.app
curl -sS "$URL/api/health" | jq .
curl -sS -o /dev/null -w "%{http_code}\n" "$URL/intake"
```

The scheduled Smoke workflow still defaults to production unless `SMOKE_BASE_URL` is set.

## 4. Promote

After Preview looks good: merge to `main` → production deploy. Keep production `DATABASE_URL` and `PROCESS_SECRET` unchanged.
