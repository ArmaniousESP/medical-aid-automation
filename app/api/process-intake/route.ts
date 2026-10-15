import { NextRequest, NextResponse } from 'next/server';
import { processPlatformIntake } from '@/lib/processIntake';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';
import { resolveOrgScope } from '@/lib/orgScope';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Process platform intake rows (no Google Sheet required) */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL required' },
        { status: 503 }
      );
    }
    const body = await req.json().catch(() => ({}));
    const scope = await resolveOrgScope(req);
    const dryRun = !!body.dryRun;
    const result = await processPlatformIntake(dryRun, {
      org_codes: scope.all ? undefined : scope.org_codes,
    });

    if (!dryRun && Array.isArray(result.details)) {
      for (const d of result.details as Array<Record<string, any>>) {
        const id = d?.id ? String(d.id) : undefined;
        if (d?.enroll?.ok && d?.enroll?.program_id) {
          await writeAudit({
            actor: scope.email || 'process-intake',
            action: 'program.enrolled',
            entity_type: 'aid_request',
            entity_id: id,
            org_code: scope.org_codes[0],
            meta: {
              program_id: d.enroll.program_id,
              program_code: d.enroll.program_code,
            },
          });
        }
        if (d?.claim?.id) {
          await writeAudit({
            actor: scope.email || 'process-intake',
            action: d.claim.created ? 'claim.created' : 'claim.exists',
            entity_type: 'claim',
            entity_id: String(d.claim.id),
            meta: { aid_request_id: id, program_id: d.enroll?.program_id },
          });
        }
      }
      await writeAudit({
        actor: scope.email || 'process-intake',
        action: 'intake.batch_processed',
        entity_type: 'batch',
        meta: {
          processed: result.processed,
          enrolled: result.enrolled,
          claims_created: result.claims_created,
        },
      });
    }

    return NextResponse.json({
      ...result,
      org_scope: {
        all: scope.all,
        org_codes: scope.org_codes,
        source: scope.source,
      },
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
