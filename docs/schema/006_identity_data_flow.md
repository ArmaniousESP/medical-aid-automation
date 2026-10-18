# Identity & data flow

Modern platform model: **three audiences**, one Neon database, clear gates.

```
Public (no account)     Employee gate              Staff / Org ops
─────────────────       ─────────────              ────────────────
/intake                 /me                        /sign-in (Google)
/request-status         company + emp_id + phone   Neon Auth session
POST /api/intake         POST /api/employee/*       org_members + OPS_ALLOWED
GET  /api/request-status                           HMAC staff cookie
```

## Database (Neon = system of record)

| Layer | Tables | Who writes |
|-------|--------|------------|
| Intake | `aid_requests`, line items | Public submit → staff process |
| People | `employee_roster`, `prior_regimens` | HR seed / staff; employee reads own |
| Programs | `chronic_programs`, `refill_cycles` | Staff enroll & dispense |
| Tenancy | `organizations`, `org_members`, `org_registration_requests` | Platform admin approve |
| Audit | `audit_events` | System on key actions |
| Roles | `staff_roles` | Super-admin |

**Rules**

1. Neon holds PHI-adjacent ops data; public routes never list other people.
2. Employee portal verifies **company + employee ID + phone** (not a password) — low friction, still bound to roster.
3. Staff use **Google (Neon Auth)** → allowlist or `org_members` → signed `maa_ops_staff` cookie.
4. `PROCESS_SECRET` remains emergency unlock only.
5. Org scope (`resolveOrgScope`) filters claims, pharmacy, programs for non–platform-admins.

## UX principles

- **Beneficiaries:** one primary action, no account, keep Request ID.
- **Employees:** progressive disclosure — identify → history → renew / reply.
- **Staff:** Google first; show org context after session; never mix public PHI lists on open URLs.
