import { NextRequest, NextResponse } from 'next/server';
import { applyMove, listMoves, listStock } from '@/lib/inventory';
import { authorizeRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/inventory — stock levels; ?moves=1 for recent movements */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL not set', ok: false }, { status: 503 });
    }
    const stock = await listStock();
    const low = stock.filter((s) => s.is_low);
    const wantMoves = req.nextUrl.searchParams.get('moves') === '1';
    const moves = wantMoves ? await listMoves({ limit: 30 }) : undefined;
    return NextResponse.json({
      ok: true,
      count: stock.length,
      low_count: low.length,
      stock,
      moves,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Inventory failed';
    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}

/** POST /api/inventory — receive / adjust / write_off */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const move_type = body.move_type as string;
    if (!['receive', 'adjust', 'return', 'write_off'].includes(move_type)) {
      return NextResponse.json(
        { error: 'move_type must be receive|adjust|return|write_off' },
        { status: 400 }
      );
    }
    const result = await applyMove({
      drugName: body.drug_name ? String(body.drug_name) : undefined,
      skuId: body.sku_id ? String(body.sku_id) : undefined,
      move_type: move_type as any,
      qty: Number(body.qty) || 0,
      signedQty: body.signed_qty != null ? Number(body.signed_qty) : undefined,
      actor: body.actor ? String(body.actor) : 'ui',
      notes: body.notes ? String(body.notes) : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Move failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
