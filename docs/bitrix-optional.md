# Optional Bitrix24 bridge

**Do not** move aid processing into Bitrix. Neon + this platform stay the source of truth.

Bitrix is only for **office tasks / CRM visibility** when your team already works there.

## Enable

1. Bitrix24 → **Developer resources** → **Other** → **Inbound webhook**
2. Scopes: `task`, `crm` (if you want deals)
3. Copy the webhook URL (ends with `/`)

Vercel env:

```
BITRIX24_WEBHOOK_URL=https://YOUR.bitrix24.com/rest/1/xxxxx/
BITRIX_SYNC_ON_INTAKE=1

# Optional
BITRIX_TASK_RESPONSIBLE_ID=1
BITRIX_TASK_GROUP_ID=1
BITRIX_CREATE_DEAL=1
BITRIX_DEAL_CATEGORY_ID=0
```

Redeploy.

## Behaviour

On **public intake submit**, if `BITRIX_SYNC_ON_INTAKE=1`:

1. Creates a **Bitrix task** titled `Aid request …` with request ID, phone, meds summary, and link to `/intake-ops`
2. If `BITRIX_CREATE_DEAL=1`, also creates a **CRM deal** in the given funnel

Staff still process the request on the **Medical Aid platform** (Queue → Claims → Pharmacy → …).

## Disable

Remove `BITRIX_SYNC_ON_INTAKE` or leave `BITRIX24_WEBHOOK_URL` unset. Intake still works; no Bitrix calls.
