# Remaining go-live steps

**Updated:** 2026-10-18

## Done by platform ops

- [x] `ORG_REGISTRATION_MODE=approval` on Vercel (production + preview + development)
- [x] Neon **staging** branch created: `staging` (`br-cold-glade-b2zohh95`) from production `main`
- [x] Preview `DATABASE_URL` points at staging Neon (production URL unchanged)
- [x] Preview/dev `WHATSAPP_PROVIDER=none` so experiments cannot send live WhatsApp
- [x] Multi-org Admin: orgs list, members, requests, audit, stats
- [x] Smoke tests for public pages + auth-gated admin APIs

## Needs your credentials (cannot be invented)

### Live WhatsApp (optional until outreach is required)

Pick **one** provider and set on **Production** only:

**Meta Cloud API**
- `WHATSAPP_PROVIDER=meta`
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- optional: `WHATSAPP_NOTIFY_ON_INTAKE=true`

**Twilio**
- `WHATSAPP_PROVIDER=twilio`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` (e.g. `whatsapp:+1415…`)

Until then, health shows `whatsapp.mode=none` and all dashboard buttons stay dry-run safe.

### Redeploy after env changes

Vercel env changes apply on the **next** deployment. Trigger from GitHub push or Vercel → Deployments → Redeploy.

## Verify after redeploy

1. `GET /api/health` — still ok
2. Admin → Organization requests — mode shows `approval`
3. Open a PR → Preview uses staging DB (not production counts)
4. `/org/register` creates a **pending** request instead of an active org

## Staging branch reference

| Item | Value |
|------|--------|
| Neon project | `lingering-poetry-76698285` |
| Production branch | `main` / `br-holy-dew-b22pvahf` |
| Staging branch | `staging` / `br-cold-glade-b2zohh95` |
| Staging compute | `ep-still-tooth-b2x9mnzc` (pooler) |
