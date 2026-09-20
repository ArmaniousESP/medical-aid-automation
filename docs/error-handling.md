# إدارة الأخطاء المرنة (Resilient Error Handling)

## المبادئ

1. **لا تسقط الخطة كلها بسبب خطوة اختيارية** — أسعار خارجية، enroll، مخزون: soft fail.
2. **أعد المحاولة للأخطاء العابرة** — timeout / 502 / connection reset (حتى مرتين).
3. **استجابة موحّدة**: `{ ok, error, code, soft?, partial?, details? }`
4. **مزامنة المجموعات**: فشل موظف واحد لا يلغي الباقي (`sync.errors[]`).

## الرموز `code`

| code | معنى | HTTP نموذجي |
|------|------|-------------|
| `missing_env` | متغير بيئة ناقص | 503 |
| `google` | Sheets / Service Account | 502 |
| `database` | Neon / Postgres | 502 |
| `unauthorized` | سر خاطئ | 401 |
| `timeout` | مهلة | 504 |
| `validation` | طلب غير صالح | 400 |
| `unknown` | غير مصنّف | 500 |

## المكوّنات

| ملف | دور |
|-----|-----|
| `lib/errors.ts` | `AppError`, `softStep`, `withRetry`, `pipelineResult`, `jsonError` |
| `lib/db.ts` | استعلامات مع retry |
| `lib/processor.ts` | أسعار soft + enroll soft + warnings[] |
| `app/api/cron/daily` | process + sync كخط أنابيب جزئي |

## أمثلة استجابة

**نجاح جزئي (مزامنة مع أخطاء على مستوى مجموعة):**
```json
{
  "ok": true,
  "partial": true,
  "created": 10,
  "errors": ["123/مريض: duplicate key"],
  "group_errors": ["..."]
}
```

**بيئة ناقصة (لا تُفشل Action بشدة إن عُولجت كـ 503):**
```json
{
  "ok": false,
  "error": "GOOGLE_SHEET_ID required",
  "code": "missing_env",
  "soft": true
}
```

## GitHub Actions

مسارات المزامنة تعامل `503` كتحذير وليس فشلاً أحمر حتى يُضبط Google.
