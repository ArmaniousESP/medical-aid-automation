/**
 * Process pending platform intake (aid_requests):
 * match meds → triage → optional auto-enroll into chronic_programs.
 * Does not require Google Sheets.
 *
 * Env:
 *   AUTO_ENROLL_INTAKE=true (default) — enroll after match
 *   AUTO_ENROLL_INTAKE_REQUIRE_MATCH=true — skip enroll if any line score < 0.72
 */

import { listPendingIntake, updateAidRequestStatus } from '@/lib/intake';
import { normalize, bestMedMatch, parseQuantity, type MedEntry } from '@/lib/matching';
import { resolveUnitPriceWithExternal, computePriceTotal } from '@/lib/pricing';
import { medMatchConfidence } from '@/lib/confidence';
import { query } from '@/lib/db';
import { enrollChronicProgram } from '@/lib/programs';

type LineResult = {
  requested: string;
  qty: number;
  matched: string | null;
  score: number;
  confidenceBand: string;
  unitPrice: number | null;
  priceTotal: number | string | null;
  priceSource: string;
  eva: string | null;
};

async function loadMedDbFromNeon(): Promise<MedEntry[]> {
  try {
    const res = await query<{ name: string; price: string | null; eva: string | null }>(
      `SELECT name, price::text, eva FROM formulary_meds LIMIT 5000`
    ).catch(() => ({ rows: [] as { name: string; price: string | null; eva: string | null }[] }));
    if (res.rows.length) {
      return res.rows.map((r) => ({
        name: r.name,
        price: r.price,
        eva: r.eva,
        norm: normalize(r.name),
      }));
    }
  } catch {
    /* empty */
  }
  return [];
}

function autoEnrollEnabled(): boolean {
  return process.env.AUTO_ENROLL_INTAKE !== 'false';
}

function requireGoodMatch(): boolean {
  return (
    process.env.AUTO_ENROLL_INTAKE_REQUIRE_MATCH === 'true' ||
    process.env.AUTO_ENROLL_INTAKE_REQUIRE_MATCH === '1'
  );
}

function lowMatchThreshold(): number {
  const n = Number(process.env.LOW_MATCH_THRESHOLD || 0.72);
  return Number.isFinite(n) ? n : 0.72;
}

async function enrollFromMatchedRequest(
  req: {
    id: string;
    emp_name: string;
    emp_id?: string | null;
    patient_name?: string | null;
    roshetta_urls?: unknown;
  },
  lines: LineResult[]
): Promise<{ ok: boolean; program_id?: string; program_code?: string; message?: string }> {
  const empName = String(req.emp_name || '').trim();
  const empId = String(req.emp_id || '').trim() || normalize(empName);
  const patient = String(req.patient_name || empName).trim() || empName;
  if (!empName || !lines.length) {
    return { ok: false, message: 'missing employee or meds' };
  }

  const roshettaList = Array.isArray(req.roshetta_urls)
    ? (req.roshetta_urls as string[])
    : [];
  const roshettaUrl = roshettaList.find((u) => /^https?:\/\//i.test(String(u)));

  const relation =
    normalize(patient) === normalize(empName) ? 'self' : 'other';

  // Prefer extending existing active program (same employee + patient)
  try {
    const orgId = await query<{ id: string }>(
      `SELECT id FROM organizations WHERE code = 'DEFAULT' LIMIT 1`
    );
    if (orgId.rows[0]) {
      const existing = await query<{ id: string; program_code: string }>(
        `SELECT cp.id, cp.program_code
         FROM chronic_programs cp
         JOIN employees e ON e.id = cp.employee_id
         JOIN dependents d ON d.id = cp.dependent_id
         WHERE e.org_id = $1
           AND e.external_employee_id = $2
           AND lower(trim(d.full_name)) = lower(trim($3))
           AND cp.status = 'active'
         ORDER BY cp.created_at DESC
         LIMIT 1`,
        [orgId.rows[0].id, empId, patient]
      );
      if (existing.rows[0]) {
        const programId = existing.rows[0].id;
        const current = await query<{ matched_name: string | null; requested_name: string }>(
          `SELECT matched_name, requested_name FROM chronic_med_lines WHERE program_id = $1`,
          [programId]
        );
        const existingNorms = new Set(
          current.rows.map((r) => normalize(r.matched_name || r.requested_name))
        );
        let added = 0;
        let lineNo = current.rows.length;
        for (const line of lines) {
          const name = line.matched || line.requested;
          const n = normalize(name);
          if (!n || existingNorms.has(n)) continue;
          lineNo += 1;
          const isEva = !!(line.eva && normalize(String(line.eva)) !== 'not eva');
          await query(
            `INSERT INTO chronic_med_lines (
               program_id, line_code, requested_name, matched_name,
               qty_per_cycle, days_supply, formulary_flag, company_preferred, is_active
             ) VALUES ($1, $2, $3, $4, $5, 30, $6, $7, true)`,
            [
              programId,
              `L${lineNo}`,
              line.requested,
              line.matched || line.requested,
              line.qty || 1,
              isEva ? 'EVA_PREFERRED' : 'NOT_IN_EVA',
              isEva,
            ]
          );
          existingNorms.add(n);
          added += 1;
        }
        if (roshettaUrl) {
          const att = await query(
            `SELECT id FROM attachments
             WHERE entity_type = 'program' AND entity_id = $1
               AND doc_type = 'prescription' AND url = $2`,
            [programId, roshettaUrl]
          );
          if (!att.rows[0]) {
            await query(
              `INSERT INTO attachments (entity_type, entity_id, doc_type, url)
               VALUES ('program', $1, 'prescription', $2)`,
              [programId, roshettaUrl]
            );
          }
        }
        return {
          ok: true,
          program_id: programId,
          program_code: existing.rows[0].program_code,
          message:
            added > 0
              ? `Updated program (+${added} med line(s))`
              : 'Program already up to date',
        };
      }
    }
  } catch {
    /* fall through to create */
  }

  const enrolled = await enrollChronicProgram({
    externalEmployeeId: empId,
    employeeName: empName,
    patientName: patient,
    relation,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
    sequence: 1,
    roshettaUrl,
    notes: `Platform intake ${req.id}`,
    meds: lines.map((line) => {
      const isEva = !!(line.eva && normalize(String(line.eva)) !== 'not eva');
      return {
        requestedName: line.requested,
        matchedName: line.matched || line.requested,
        qtyPerCycle: line.qty || 1,
        formularyFlag: isEva ? 'EVA_PREFERRED' : 'NOT_IN_EVA',
        companyPreferred: isEva,
      };
    }),
  });

  return {
    ok: true,
    program_id: enrolled.program_id,
    program_code: enrolled.program_code,
    message: enrolled.created
      ? `Created ${enrolled.program_code}`
      : enrolled.message || 'Program exists',
  };
}

export async function processPlatformIntake(dryRun = false) {
  const pending = await listPendingIntake(100);
  const medDb = await loadMedDbFromNeon();
  const details: unknown[] = [];
  let processed = 0;
  let lowMatch = 0;
  let enrolled = 0;
  let enroll_skipped = 0;
  let enroll_errors = 0;
  const thr = lowMatchThreshold();
  const doEnroll = autoEnrollEnabled();
  const needMatch = requireGoodMatch();

  for (const req of pending) {
    const meds = (req.meds as { name: string; qty?: number }[]) || [];
    const lineResults: LineResult[] = [];
    let requestLow = false;

    for (const m of meds) {
      const text = m.name || '';
      const { qty, cleanName } = parseQuantity(text);
      const q = m.qty && m.qty > 0 ? m.qty : qty;
      const match = medDb.length
        ? bestMedMatch(cleanName, medDb)
        : { name: null as string | null, score: 0, eva: null as string | null };
      const conf = medMatchConfidence({
        matchScore: match.score || 0,
        exactNorm: match.score === 1,
        hasEvaHint: !!match.eva,
      });
      if ((match.score || 0) < thr) {
        lowMatch++;
        requestLow = true;
      }

      let unitPrice: number | null = null;
      let priceSource = 'none';
      if (medDb.length) {
        try {
          const resolved = await resolveUnitPriceWithExternal(
            match.name || cleanName,
            medDb
          );
          unitPrice = resolved.unitPrice;
          priceSource = resolved.source;
        } catch {
          /* ignore */
        }
      }

      lineResults.push({
        requested: cleanName,
        qty: q,
        matched: match.name,
        score: match.score || 0,
        confidenceBand: conf.band,
        unitPrice,
        priceTotal: computePriceTotal(unitPrice, q),
        priceSource,
        eva: match.eva,
      });
    }

    let enrollInfo: {
      ok: boolean;
      program_id?: string;
      program_code?: string;
      message?: string;
    } | null = null;

    if (!dryRun) {
      await updateAidRequestStatus(req.id, 'triage', {
        match_notes: JSON.stringify(lineResults).slice(0, 4000),
      });

      if (doEnroll && lineResults.length > 0) {
        if (needMatch && requestLow) {
          enroll_skipped += 1;
          enrollInfo = {
            ok: false,
            message: 'Skipped enroll: low match (AUTO_ENROLL_INTAKE_REQUIRE_MATCH)',
          };
        } else {
          try {
            enrollInfo = await enrollFromMatchedRequest(req, lineResults);
            if (enrollInfo.ok && enrollInfo.program_id) {
              await updateAidRequestStatus(req.id, 'enrolled', {
                match_notes: JSON.stringify({
                  lines: lineResults,
                  enroll: enrollInfo,
                }).slice(0, 4000),
                program_id: enrollInfo.program_id,
              });
              enrolled += 1;
            } else {
              enroll_skipped += 1;
            }
          } catch (e: unknown) {
            enroll_errors += 1;
            enrollInfo = {
              ok: false,
              message: e instanceof Error ? e.message : 'enroll failed',
            };
          }
        }
      }
    } else if (doEnroll && lineResults.length > 0 && !(needMatch && requestLow)) {
      enrollInfo = { ok: true, message: '[dry-run] would enroll' };
    }

    processed++;
    details.push({
      id: req.id,
      emp_name: req.emp_name,
      patient_name: req.patient_name,
      lines: lineResults,
      enroll: enrollInfo,
    });
  }

  const parts = [
    dryRun ? '[DRY RUN]' : null,
    `Triaged ${processed}`,
    doEnroll ? `enrolled ${enrolled}` : 'enroll off',
    enroll_skipped ? `enroll skipped ${enroll_skipped}` : null,
    enroll_errors ? `enroll errors ${enroll_errors}` : null,
    lowMatch ? `low-match lines ${lowMatch}` : null,
  ].filter(Boolean);

  return {
    ok: true,
    dryRun,
    pending: pending.length,
    processed,
    lowMatch,
    enrolled,
    enroll_skipped,
    enroll_errors,
    auto_enroll: doEnroll,
    details: details.slice(0, 20),
    message: parts.join(' · '),
  };
}
