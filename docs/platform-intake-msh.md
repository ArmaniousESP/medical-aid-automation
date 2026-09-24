# Platform intake (no Google Form) + MSH

## Goal

End dependence on Google Forms / Sheets for the monthly aid cycle.  
**System of record:** Neon (`aid_requests`) on this platform.  
**Catalog / estimates:** Medicine Support Hub (MSH) when reachable.

## New surfaces

| Surface | Role |
|---------|------|
| `/intake` | Beneficiary form → `POST /api/intake` |
| `GET /api/intake` | Ops list |
| `POST /api/process-intake` | Match + triage + **auto-enroll** |
| `lib/msh.ts` | Catalog search + cost estimate |

## Status flow

`submitted` → `triage` → **`enrolled`** (auto) → `dispensed`  
Or stay `triage` if enroll is skipped / fails.

### Auto-enroll (default **on**)

After matching each pending request, `process-intake`:

1. Saves match notes  
2. Creates or extends `chronic_programs` + med lines  
3. Sets `status = enrolled` and `program_id`

```bash
AUTO_ENROLL_INTAKE=true   # default; set false to triage only

# optional: only enroll when all lines score ≥ threshold
AUTO_ENROLL_INTAKE_REQUIRE_MATCH=true
LOW_MATCH_THRESHOLD=0.72
```

## Env

```bash
DATABASE_URL=          # required
PROCESS_SECRET=        # protect ops list/process
MSH_API_BASE=https://medicinesupport.app
MSH_API_KEY=           # optional partner key
AUTO_ENROLL_INTAKE=true
```

## MSH MCP (chat)

Reconnect: https://medicinesupport.app/mcp-oauth/  
Tools: search medicines, estimate cost, submit support request, list my requests.

## Migration from Google

1. Share `/intake` with beneficiaries (replace Form link).
2. Ops runs `POST /api/process-intake` instead of sheet Process.
3. Programs appear under `/programs` (Neon).
4. Disable sheet path when backlog is empty.

## Legacy

`/api/process` still reads Google when configured. Prefer `/api/process-intake` for new work.
