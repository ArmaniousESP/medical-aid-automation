# Email notifications

## Provider

[Resend](https://resend.com) REST API (`POST https://api.resend.com/emails`) with shared webhook retry.

## Env (Vercel)

| Variable | Required | Purpose |
|----------|----------|--------|
| `RESEND_API_KEY` | yes | API key |
| `EMAIL_FROM` | yes | Verified sender, e.g. `Medical Aid <ops@domain.com>` |
| `EMAIL_TO` | yes for defaults | Comma-separated ops inboxes |
| `EMAIL_REPLY_TO` | no | Reply-To |
| `EMAIL_NOTIFY_ON_PROCESS` | no | `true` = email after each process |
| `EMAIL_NOTIFY_DRY_RUN` | no | `true` = also email dry runs |
| `EMAIL_NOTIFY_REVIEW` | no | default on; extra email when OCR low-conf skips |
| `NEXT_PUBLIC_APP_URL` | recommended | Links in email body |

## Events

1. **Process summary** — new rows, low match, OCR filled/skipped, invoice fails  
2. **Review needed** — when `ocr_skipped_low_confidence > 0`  
3. **Custom** — `POST /api/notifications/email`

## API

```bash
GET  /api/notifications/email   # config status
POST /api/notifications/email
{ "type": "custom", "subject": "…", "text": "…", "to": "a@b.com" }

{ "type": "process_summary", "message": "…", "newRows": 3, "lowMatch": 1 }

{ "type": "review_needed", "count": 2, "samples": ["ocr_low_conf:…"] }
```

Process with one-off notify:

```bash
POST /api/process
{ "dryRun": false, "notifyEmail": true }
```

## UI

`/notifications` — Email (Resend) panel + test send.
