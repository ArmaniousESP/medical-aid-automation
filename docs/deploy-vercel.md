# Automated Vercel deployment

## Path A — Vercel ↔ GitHub (recommended, zero secrets in Actions)

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your project **medical-aid-automation**
2. **Settings → Git**
3. Confirm connected repository: `ArmaniousESP/medical-aid-automation`
4. Production Branch: **`main`**
5. Enable **Auto-deploy** on push (default)

Then every `git push` to `main` builds and deploys production automatically.

**If deploys stall:** Deployments → latest → **Redeploy** once, or disconnect/reconnect Git.

---

## Path B — GitHub Action CLI deploy (explicit)

Workflow: `.github/workflows/deploy-vercel.yml`

Runs on **push to `main`** and **Actions → Deploy Vercel → Run workflow**.

### Add repository secrets

**GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | How to get it |
|--------|----------------|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens → Create Token |
| `VERCEL_ORG_ID` | After `vercel link`, read `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | Same file → `projectId` |
| `VERCEL_APP_URL` | Optional: `https://medical-aid-automation.vercel.app` |

Local one-time:

```bash
npm i -g vercel
vercel login
cd medical-aid-automation
vercel link
cat .vercel/project.json
```

Without these secrets the Action **skips** (exit 0) and relies on Path A.

---

## Environment variables (Vercel only)

**Vercel → Project → Settings → Environment Variables** (Production):

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | Yes (Neon pooler) |
| `PROCESS_SECRET` | Yes for protected APIs |
| `GOOGLE_*` / sheet id | For sheet processing |
| WhatsApp vars | Optional |

After changing env vars: **Redeploy** or push a new commit.

---

## Verify

```bash
curl -sS https://medical-aid-automation.vercel.app/api/health
```

Or open: https://medical-aid-automation.vercel.app/status

GitHub: **Actions** tab → “Deploy Vercel” run summary.
