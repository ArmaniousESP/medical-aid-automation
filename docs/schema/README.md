# Neon database — Medical Aid OS

## Project

| Field | Value |
|-------|-------|
| Name | `medical-aid-automation` |
| Project ID | `lingering-poetry-76698285` |
| Region | `aws-eu-central-1` |
| Database | `neondb` |
| Console | https://console.neon.tech |

## Schema files

- `001_chronic_core.sql` — organizations, employees, dependents, programs, med lines, refills, attachments, formulary, audit

## Env (Vercel / local)

```bash
DATABASE_URL=postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require
```

Use the **pooled** connection string from Neon console for serverless (Vercel).

Never commit real credentials.

## Tables

organizations → employees → dependents → chronic_programs → chronic_med_lines
                                              ↓
                                        refill_cycles → refill_items
