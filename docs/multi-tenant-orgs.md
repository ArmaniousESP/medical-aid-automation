# Multi-tenant organizations

Other companies can run their chronic medicine support programs on this platform.

## Model

| Entity | Purpose |
|--------|---------|
| `organizations` | Tenant workspace (code, name, slug, contact) |
| `org_members` | Staff of that org (`org_admin` · `org_operator` · `org_viewer`) |
| `org_registration_requests` | Optional approval queue |

Employees and requests stay linked by **company name** / `org_code` as today; the org account is the **admin boundary** for each institution.

## Public signup

- Page: [`/org/register`](https://medical-aid-automation.vercel.app/org/register)
- API: `POST /api/orgs/register`

```json
{
  "org_name": "Acme Pharma Egypt",
  "org_code": "ACME",
  "contact_name": "Sara Ahmed",
  "contact_email": "ops@acme.com",
  "contact_phone": "01xxxxxxxxx",
  "employee_count_est": 200,
  "message": "We run monthly chronic support for employees"
}
```

### Activation modes

| Env | Behavior |
|-----|----------|
| default (unset) | **Immediate** create org + first `org_admin` member |
| `ORG_REGISTRATION_MODE=approval` | Store pending request; platform admin approves |

## After registration

1. Platform operator adds the contact email to `OPS_ALLOWED_EMAILS` or `staff_roles` so Google sign-in works.
2. Org staff use `/sign-in` then the normal ops path (Queue → Claims → Pharmacy → Programs).
3. Beneficiaries use `/intake` and `/me` with **that company’s** name + employee ID + phone.

## Data isolation (current → next)

**Today**

- Org registry + membership exist.
- Request rows still use free-text `company` / `org_code` (DEFAULT).
- Ops users with PROCESS_SECRET or allowlisted email see the shared ops UI (same deployment).

**Next hardening (recommended)**

1. Set `aid_requests.org_id` on intake from selected organization.
2. Scope staff list/query APIs by `org_members` for non–platform-admin users.
3. Optional subdomain or `?org=slug` for branded employee portal.

## Platform super-admin

Emails in `OPS_ADMIN_EMAILS` remain global super-admins (all orgs + role management).

## Schema

See `docs/schema/005_org_accounts.sql`. Tables are also created at runtime by `lib/organizations.ts`.
