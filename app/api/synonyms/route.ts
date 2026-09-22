import { NextRequest, NextResponse } from 'next/server';
import {
  listSynonyms,
  listBuiltinSynonyms,
  upsertSynonym,
  seedBuiltinSynonymsToDb,
  expandDrugTokens,
} from '@/lib/drugSynonyms';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    if (sp.get('resolve')) {
      const exp = await expandDrugTokens(sp.get('resolve')!);
      return NextResponse.json({ ok: true, ...exp });
    }
    const db = process.env.DATABASE_URL
      ? await listSynonyms(300)
      : [];
    return NextResponse.json({
      ok: true,
      builtin: listBuiltinSynonyms(),
      db,
      builtin_count: listBuiltinSynonyms().length,
      db_count: db.length,
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));

    if (body.seed_builtin === true) {
      const n = await seedBuiltinSynonymsToDb();
      return NextResponse.json({ ok: true, seeded: n });
    }

    if (!body.alias || !body.ingredient) {
      return NextResponse.json(
        { ok: false, error: 'alias and ingredient required' },
        { status: 400 }
      );
    }

    const row = await upsertSynonym({
      alias: String(body.alias),
      ingredient: String(body.ingredient),
      source: body.source ? String(body.source) : 'manual',
    });
    return NextResponse.json({ ok: true, ...row });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
