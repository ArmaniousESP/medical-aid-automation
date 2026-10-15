# Multi-tenant organizations

Other companies can run their chronic medicine support programs on this platform.

## Model

| Entity | Purpose |
|--------|---------|
| `organizations` | Tenant workspace (code, name, slug, contact) |
| `org_members` | Staff of that org (`org_admin` · `org_operator` · `org_viewer`) |
| `org_registration_requests` | Optional approval queue |
| `aid_requests.org_code` | Tenant tag on each intake row |
| `employees.org_id` / `chronic_programs.org_id` | Program-side tenant |

## Public signup

- Page: `/org/register`
- API: `POST /api/orgs/register`

```json
{
  "org_name": "Acme Pharma Egypt",
  "org_code": "ACME",
  "contact_name": "Sara Ahmed",
  "contact_email": "ops@acme.com",
  "contact_phone": "01xxxxxxxxx",
  "employee_count_est": 200
}
```

### Activation modes

| Env | Behavior |
|-----|----------|
| default | **Immediate** create org + first `org_admin` |
| `ORG_REGISTRATION_MODE=approval` | Pending until platform admin approves |

## After registration

1. Add contact email to `OPS_ALLOWED_EMAILS` **or** keep them only in `org_members` (org-scoped).
2. Staff sign in with Google on `/sign-in`.
3. Employees use `/me` and `/intake` with that company name.

## Data isolation

| Caller | Sees |
|--------|------|
| `OPS_ADMIN_EMAILS` / staff role `admin` | All organizations |
| `PROCESS_SECRET` unlock (no email) | All (legacy shared ops) |
| Google user who is only in `org_members` | **Only their org(s)** queue, programs, claims |
| Google user on allowlist but **not** in `org_members` | All (backward compatible) |

Intake sets `org_code` by matching `company` to `organizations.name` / `code` / `slug` (else `DEFAULT`).

Programs list filters `chronic_programs` via `employees.org_id`.

## Platform super-admin

`OPS_ADMIN_EMAILS` remains global.

## Schema

`docs/schema/005_org_accounts.sql` + runtime `ensureOrgTables()`.
