import { NextRequest, NextResponse } from 'next/server';
import {
  bootstrapFromIntake,
  learningSummary,
  recordSignal,
  suggestFromLearning,
} from '@/lib/learning';

export const dynamic = 'force-dynamic';

/** GET ?key=city | ?summary=1 — ranked suggestions or insights. */
export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get('summary') === '1') {
      const summary = await learningSummary();
      return NextResponse.json({ ok: true, summary });
    }

    const key = req.nextUrl.searchParams.get('key') || '';
    if (!key) {
      return NextResponse.json({ ok: false, error: 'key required' }, { status: 400 });
    }
    const q = req.nextUrl.searchParams.get('q') || undefined;
    const limit = Number(req.nextUrl.searchParams.get('limit') || 12);
    const items = await suggestFromLearning({ key, q, limit });
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error', items: [] },
      { status: 500 }
    );
  }
}

/** POST { key, value, label? } or { action: 'bootstrap' }. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (body.action === 'bootstrap') {
      const result = await bootstrapFromIntake(
        typeof body.limit === 'number' ? body.limit : 500
      );
      return NextResponse.json({ ok: true, ...result });
    }

    if (Array.isArray(body.signals)) {
      let recorded = 0;
      for (const s of body.signals) {
        if (!s?.key || !s?.value) continue;
        const r = await recordSignal({
          key: String(s.key),
          value: String(s.value),
          label: s.label ? String(s.label) : undefined,
          weight: typeof s.weight === 'number' ? s.weight : 1,
        });
        if (r.ok) recorded++;
      }
      return NextResponse.json({ ok: true, recorded });
    }

    if (!body.key || !body.value) {
      return NextResponse.json(
        { ok: false, error: 'key and value required' },
        { status: 400 }
      );
    }

    const r = await recordSignal({
      key: String(body.key),
      value: String(body.value),
      label: body.label ? String(body.label) : undefined,
      weight: typeof body.weight === 'number' ? body.weight : 1,
    });
    return NextResponse.json(r);
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Error' },
      { status: 500 }
    );
  }
}
