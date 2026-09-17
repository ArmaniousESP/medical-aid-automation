# نشر Vercel عبر GitHub

## الطريقة 1 — الربط الأصلي (الأبسط)

إذا كان المشروع مربوطاً بـ GitHub من لوحة Vercel:

1. أي `git push` على `main` → Vercel يبني وينشر تلقائياً.
2. لا تحتاج Action إضافي.

تحقق: **Vercel → Project → Settings → Git**

---

## الطريقة 2 — GitHub Action (صريح / يدوي)

الملف: `.github/workflows/deploy-vercel.yml`

- يعمل عند **push إلى `main`**
- ويمكن تشغيله يدوياً: **Actions → Deploy Vercel → Run workflow**

### أسرار GitHub المطلوبة

**Repo → Settings → Secrets and variables → Actions**

| Secret | من أين |
|--------|--------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create |
| `VERCEL_ORG_ID` | Vercel → Team Settings → General → Team ID  
| أو من ملف `.vercel/project.json` بعد `vercel link` |
| `VERCEL_PROJECT_ID` | Project → Settings → General → Project ID |

### كيف تحصل على Org / Project ID بسرعة

على جهازك (مرة واحدة):

```bash
npm i -g vercel
vercel login
cd medical-aid-automation
vercel link   # اختر المشروع
cat .vercel/project.json
```

ستجد `orgId` و `projectId`.

---

## متغيرات البيئة على Vercel (ليست في GitHub)

هذه تُضبط في **Vercel → Settings → Environment Variables** وليس في الكود:

| Variable | مطلوب |
|----------|--------|
| `DATABASE_URL` | نعم (Neon pooler) |
| `PROCESS_SECRET` | مستحسن |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | لمعالجة الشيت |
| `GOOGLE_PRIVATE_KEY` | لمعالجة الشيت |
| `GOOGLE_SHEET_ID` | لمعالجة الشيت |
| `VERCEL_APP_URL` | اختياري |

بعد أي تغيير في المتغيرات: **Redeploy** أو ادفع commit جديد / شغّل Action.

---

## أسرار GitHub للتشغيل المجدول (ليست للنشر)

| Secret | الغرض |
|--------|--------|
| `VERCEL_APP_URL` | `https://medical-aid-automation.vercel.app` |
| `PROCESS_SECRET` | نفس قيمة Vercel — لاستدعاء `/api/process` |

---

## التحقق بعد النشر

```bash
curl -sS https://medical-aid-automation.vercel.app/api/health
```

أو افتح: https://medical-aid-automation.vercel.app/status
