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
| `POST /api/process-intake` | Match/triage pending rows |
| `lib/msh.ts` | Catalog search + cost estimate |

## Status flow

`submitted` → `triage` → `approved` / `rejected` → `enrolled` → `dispensed`

## Env

```bash
DATABASE_URL=          # required
PROCESS_SECRET=        # protect ops list/process
MSH_API_BASE=https://medicinesupport.app
MSH_API_KEY=           # optional partner key
```

## MSH MCP (chat)

Reconnect: https://medicinesupport.app/mcp-oauth/  
Tools: search medicines, estimate cost, submit support request, list my requests.

## Migration from Google

1. Share `/intake` with beneficiaries (replace Form link).
2. Ops uses `/requests` + `process-intake` instead of sheet Process.
3. Keep sheet sync **read-only** until backlog is empty, then disable `GOOGLE_*` process path.
4. Chronic programs already live in Neon — enroll continues from approved platform rows.

## Legacy

`/api/process` still reads Google when configured. Prefer `/api/process-intake` for new work.
