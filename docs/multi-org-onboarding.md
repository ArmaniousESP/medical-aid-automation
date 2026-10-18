# Multi-organization onboarding

How other institutions join and operate on Medical Aid Automation.

## For the new organization

1. Open **[/org/register](https://medical-aid-automation.vercel.app/org/register)**
2. Submit organization name, contact person, and work email
3. Wait for activation:
   - **Auto mode** (default): org becomes active immediately
   - **Approval mode** (`ORG_REGISTRATION_MODE=approval`): platform admin reviews the request
4. Contact person signs in at **/sign-in** with Google (same email)
5. Platform admin (or org admin) invites more staff under **Admin → Org members**

## Roles

| Role | Access |
|------|--------|
| `org_admin` | Full ops for this org + invite members |
| `org_operator` | Queue, claims, pharmacy, programs for this org |
| `org_viewer` | Read-only within the org |
| Platform admin (`OPS_ADMIN_EMAILS` / staff role admin) | All orgs |

## Data isolation

- New intake rows get `org_code` from company name / aliases
- Claims and pharmacy lists are filtered by the signed-in member’s orgs
- Public pages still only expose intake + request status (names masked unless the employee verifies ownership)

## For platform operators

| Task | Where |
|------|--------|
| See active orgs | Admin → Organizations |
| Approve pending orgs | Admin → Organization requests |
| Invite staff | Admin → Org members |
| Audit actions | Admin → Audit log |
| Force approval queue | Vercel env `ORG_REGISTRATION_MODE=approval` |

Seeded Egypt orgs: `ARMANIOUS`, `EVA`, `TAGMEEL`, plus `DEFAULT` fallback.

## Checklist before go-live for a new org

- [ ] Org row active in Organizations panel
- [ ] At least one `org_admin` invited and able to sign in
- [ ] Company name aliases match how employees type the company on intake
- [ ] Test submit → status → process-intake dry-run for that org
- [ ] Optional: WhatsApp credentials if the org will receive notifications
