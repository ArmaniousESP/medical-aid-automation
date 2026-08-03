# Medical Aid Automation

**طلب مساعدة علاج شهري — استمارة 9**

Automated processing of Google Form responses for monthly medical aid requests.

- Expands up to 7 medications per submission into individual rows  
- Fuzzy-matches against the `MEDDB3` catalog  
- Determines **Available in EVA** / **NOT IN EVA** + alternative  
- Parses quantity from free-text (Arabic + English)  
- Carries attachment links (روشتة, فحوصات, كارنيه, إثبات قرابة…) into Notes  
- Appends clean rows to the `Approved-Requests` sheet  

Built with **Next.js 14** · Deployed on **Vercel** · Version-controlled on **GitHub**

---

## Features

| Feature | Description |
|---------|-------------|
| Medication expansion | One form response → multiple rows |
| Fuzzy matching | Token + bigram similarity against MEDDB3 |
| Quantity parsing | Leading numbers, `x3`, Arabic words (`علبتين`, `شريطين`…) |
| Attachment links | Roshetta, labs, card, proof of relation → Notes column |
| Dry-run mode | Preview without writing |
| Dashboard UI | One-click process + sample table |
| Cron-ready | Daily Vercel Cron support |

---

## Quick Start (Local)

```bash
git clone https://github.com/ArmaniousESP/medical-aid-automation.git
cd medical-aid-automation
npm install
cp .env.example .env.local
# edit .env.local with your values
npm run dev
```

Open http://localhost:3000

---

## Google Cloud Setup (required once)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. Enable **Google Sheets API**.
3. Create a **Service Account** → download the JSON key.
4. Copy:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY` (keep the `\n` characters)
5. Open your Google Sheet → **Share** → add the service account email as **Editor**.
6. Copy the Sheet ID from the URL (`https://docs.google.com/spreadsheets/d/SHEET_ID/edit`) → `GOOGLE_SHEET_ID`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | Service account email |
| `GOOGLE_PRIVATE_KEY` | Yes | Private key (with `\n`) |
| `GOOGLE_SHEET_ID` | Yes | Spreadsheet ID |
| `PROCESS_SECRET` | Recommended | Protects `/api/process` |

---

## Deploy to Vercel

### Option A — Vercel Dashboard (easiest)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository `ArmaniousESP/medical-aid-automation`
3. Add the environment variables listed above
4. Deploy

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
vercel env add GOOGLE_PRIVATE_KEY
vercel env add GOOGLE_SHEET_ID
vercel env add PROCESS_SECRET
vercel --prod
```

After deploy, update `vercel.json` cron path with your real `PROCESS_SECRET`.

---

## Usage

### Dashboard
Open the deployed URL → click **Dry Run** or **Process New Responses**.

### API

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

# Or GET (useful for cron)
curl "https://your-app.vercel.app/api/process?secret=YOUR_SECRET"
```

### Daily Cron
`vercel.json` already contains a daily cron at 06:00 UTC.  
Replace `CHANGE_ME` with your real `PROCESS_SECRET`.

---

## Sheet Structure Expected

| Sheet | Purpose |
|-------|--------|
| `Form Responses 1` | Raw Google Form submissions |
| `Approved-Requests` | Processed / expanded rows (output) |
| `MEDDB3` | Medication catalog (name, price, Eva-similar) |

---

## Notes Column Content

Each new row’s Notes field may contain:

```
LOW MATCH (0.61) - review needed | original: ... | روشتة: https://drive.google.com/... | فحوصات: ... | كارنيه: ... | إثبات قرابة: ...
```

---

## License

Private – internal use.
