# مزامنة الشيت → قاعدة البيانات (آلية)

## الهدف

قراءة تبويب **Approved-Requests** من Google Sheet وكتابة/تحديث:

- `employees`
- `dependents`
- `chronic_programs`
- `chronic_med_lines`
- `attachments` (روشتة إن وُجدت)

بعد المزامنة يعمل النظام من **Neon** (صرف، صيدلية، مخزون، تقارير) دون الاعتماد على الشيت في كل طلب.

## الجدولة

| الآلية | الموعد | المسار |
|--------|--------|--------|
| Vercel Cron | كل 6 ساعات (`0 */6 * * *`) | `/api/cron/sync-sheet` |
| GitHub Action | كل 6 ساعات | `sync-sheet-to-db.yml` |
| يومي (معالجة + مزامنة) | 06:00 UTC | `/api/cron/daily` |
| يدوي | — | `POST /api/programs/sync-from-sheet` |

## متغيرات Vercel المطلوبة

```
DATABASE_URL=...                    # Neon pooler
GOOGLE_SHEET_ID=1hvCYYW6KABRIhIYe0qKsFxMVEI0ZbvdkBQhaysQ-tXM
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@....iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
PROCESS_SECRET=...                  # مستحسن
```

شارك الشيت مع إيميل الـ Service Account كـ **Editor**.

## تشغيل يدوي

```bash
curl -X POST "https://medical-aid-automation.vercel.app/api/cron/sync-sheet" \
  -H "x-process-secret: $PROCESS_SECRET"
```

أو من GitHub: **Actions → Sync Sheet → Database → Run workflow**

## السلوك

- تجميع الصفوف حسب `employee_id + patient`
- إنشاء برنامج إن لم يوجد
- إضافة أدوية جديدة فقط (لا يحذف بنوداً موجودة)
- آمن للتكرار (idempotent جزئياً)

## ملاحظات

- بدون `GOOGLE_*` يرجع الـ cron HTTP 503 ويُتخطى في Action بدون فشل أحمر.
- الاستيراد الأولي الكبير يمكن تنفيذه مرة من Drive (تم: ~254 برنامجاً).
- المزامنة المجدولة تلتقط الطلبات الجديدة بعد معالجة الاستمارة إلى Approved-Requests.
