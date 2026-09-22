# DDInter 2.0 integration

## Source
- Site: https://ddinter2.scbdd.com
- License: **CC BY-NC-SA 4.0** (non-commercial share-alike)
- CSV: `DDInterID_A,Drug_A,DDInterID_B,Drug_B,Level` (Major / Moderate / Minor)
- ~302k DDI pairs across ATC download files A, B, D, H, L, P, R, V

## Setup
1. Deploy with `DATABASE_URL`
2. Open `/ddinter` → **Import all ATC files** (or B only for a quick test)
3. Or: `POST /api/ddinter/import` with `x-process-secret`

Vercel `maxDuration` for import should be high (300s). Import may need several runs if timeouts — import by code batch.

## Check
```bash
curl "https://YOUR_APP/api/ddinter/check?drugs=Warfarin,Aspirin"
curl "https://YOUR_APP/api/ddinter/check?program_id=UUID"
```

## UI
- `/ddinter` — import + manual check
- `/combinations` — co-prescription patterns (separate from DDInter)

## Disclaimer
Ops triage only. Not a licensed clinical decision-support system.
Egyptian trade names may need ingredient mapping (MEDDB3) for better hit rates.
