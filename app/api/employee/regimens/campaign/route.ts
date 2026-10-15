import { NextRequest, NextResponse } from 'next/server';
import {
  listRenewalRecipients,
  notifyRenewalCampaign,
} from '@/lib/renewalCampaign';
import { RENEWAL_DEADLINE, RENEWAL_YEAR, priorRegimenCount } from '@/lib/priorRegimens';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secrets = (process.env.PROCESS_SECRET || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!secrets.length) return false;
  const got =
    req.headers.get('x-process-secret') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    '';
  return secrets.includes(got);
}

/** GET campaign summary (staff) */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const total = await priorRegimenCount();
    const pending = await listRenewalRecipients({ only_pending: true, limit: 500 });
    const withPhone = pending.filter(
      (r) => r.phone && r.phone.replace(/\D/g, '').length >= 8
    );
    return NextResponse.json({
      ok: true,
      renewal_year: RENEWAL_YEAR,
      deadline: RENEWAL_DEADLINE,
      total_regimens: total,
      pending_count: pending.length,
      with_phone: withPhone.length,
      sample: pending.slice(0, 8),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}

/** POST { dry_run?: true, limit?, company? } — WhatsApp renewal campaign */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false && body.dryRun !== false;
    const result = await notifyRenewalCampaign({
      dry_run,
      limit: body.limit ? Number(body.limit) : 50,
      company: body.company ? String(body.company) : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
