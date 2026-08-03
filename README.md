# Medical Aid Automation

**طلب مساعدة علاج شهري — استمارة 9**

Automated processing of Google Form responses for monthly medical aid requests.

- Expands up to 7 medications per submission into individual rows  
- Fuzzy-matches against the `MEDDB3` catalog  
- Determines **Available in EVA** / **NOT IN EVA** + alternative  
- Parses quantity from free-text (Arabic + English)  
- Carries attachment links (روشتة, فحوصات, كارنيه, إثبات قرابة…) into Notes  
- Appends clean rows to the `Approved-Requests` sheet  

Built with **Next.js 14** · Deployed on **Vercel** · Version-controlled on **GitHub** · Scheduled via **GitHub Actions**

---

## Features

| Feature | Description |
|---------|-------------|
| Medication expansion | One form response → multiple rows |
| Fuzzy matching | Token + bigram similarity against MEDDB3 |
| Quantity parsing | Leading numbers, `x3`, Arabic words (`علبتين`, `شريطين`…) |
| Attachment links | Roshetta, labs, card, proof of relation → Notes + UI |
| Dry-run mode | Preview without writing |
| Dashboard UI | Filters (Low match / EVA / Not EVA), clickable Drive links |
| Vercel Cron | Daily at 06:00 UTC |
| GitHub Action | Daily schedule + manual trigger |

---

## 1. Google Cloud Service Account (step-by-step)

You only need to do this **once**.

### Step 1 — Create / select a project
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown (top bar) → **New Project**
3. Name it e.g. `medical-aid-automation` → Create

### Step 2 — Enable Google Sheets API
1. Go to **APIs & Services → Library**
2. Search for **Google Sheets API**
3. Click it → **Enable**

### Step 3 — Create a Service Account
1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → Service account**
3. Service account name: `medical-aid-bot`
4. Click **Create and Continue**
5. Skip optional roles (or grant “Editor” if you prefer) → **Done**

### Step 4 — Create a JSON key
1. In the Credentials list, click the service account you just created
2. Go to the **Keys** tab
3. **Add Key → Create new key → JSON**
4. A JSON file downloads. Keep it private.

### Step 5 — Extract the values
Open the JSON file. You need two fields:

```json
{
  "client_email": "medical-aid-bot@YOUR_PROJECT.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
}
```

- `client_email` → use as `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → use as `GOOGLE_PRIVATE_KEY`  
  **Important:** keep the `\n` characters exactly as they appear (or replace real newlines with `\n` when pasting into Vercel/GitHub).

### Step 6 — Share the Google Sheet
1. Open your spreadsheet:  
   `طلب مساعدة علاج شهري - استمارة 9 (Responses)`
2. Click **Share**
3. Paste the **service account email** (`...@...iam.gserviceaccount.com`)
4. Give it **Editor** access → Send / Share

### Step 7 — Get the Sheet ID
From the browser URL:

```
https://docs.google.com/spreadsheets/d/  1abcXYZ...  /edit
                                       ↑ this is GOOGLE_SHEET_ID
```

---

## 2. Environment Variables

| Variable | Required | Where to set |
|----------|----------|--------------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | Vercel + GitHub Secrets |
| `GOOGLE_PRIVATE_KEY` | Yes | Vercel + GitHub Secrets |
| `GOOGLE_SHEET_ID` | Yes | Vercel + GitHub Secrets |
| `PROCESS_SECRET` | Recommended | Vercel + GitHub Secrets |
| `VERCEL_APP_URL` | For GitHub Action | GitHub Secrets only |

---

## 3. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `ArmaniousESP/medical-aid-automation`
3. Add the four environment variables above
4. Deploy

After the first deploy, copy your production URL (e.g. `https://medical-aid-automation.vercel.app`).

---

## 4. GitHub Action (scheduled + manual)

### Add repository secrets

Go to the repo → **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret name | Value |
|-------------|-------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | from the JSON |
| `GOOGLE_PRIVATE_KEY` | full private key (with `\n`) |
| `GOOGLE_SHEET_ID` | sheet ID |
| `PROCESS_SECRET` | same secret you set on Vercel |
| `VERCEL_APP_URL` | `https://your-app.vercel.app` (no trailing slash) |

### What the Action does
- Runs **every day at 06:00 UTC** (08:00 Cairo)
- Can also be triggered manually from the **Actions** tab
- Supports a **Dry Run** option when triggered manually
- Calls your deployed `/api/process` endpoint and writes a summary

File: `.github/workflows/process-medical-aid.yml`

---

## 5. Local development

```bash
git clone https://github.com/ArmaniousESP/medical-aid-automation.git
cd medical-aid-automation
npm install
cp .env.example .env.local
# fill the values
npm run dev
```

Open http://localhost:3000

---

## 6. Dashboard UI

After processing you can:

- Filter: **All** / **Low match only** / **Available in EVA** / **NOT IN EVA**
- See match score (%)
- Click **روشتة** and **فحوصات** Drive links directly
- Low-match rows are highlighted in amber

---

## 7. API usage

```bash
# Dry run
curl -X POST https://your-app.vercel.app/api/process \
  -H "Content-Type: application/json" \
  -H "x-process-secret: YOUR_SECRET" \
  -d '{"dryRun": true}'

# Real run
curl -X POST https://your-app.vercel.app/api/process \
  -H "Content-Type: application/json" \
  -H "x-process-secret: YOUR_SECRET" \
  -d '{"dryRun": false}'
```

---

## Sheet structure expected

| Sheet | Purpose |
|-------|--------|
| `Form Responses 1` | Raw Google Form submissions |
| `Approved-Requests` | Processed / expanded rows (output) |
| `MEDDB3` | Medication catalog (name, price, Eva-similar) |

---

## License

Private – internal use.
