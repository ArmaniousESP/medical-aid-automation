import { NextRequest, NextResponse } from 'next/server';
import {
  applyMove,
  inventorySummary,
  listMoves,
  listStock,
  seedSkusFromFormulary,
  stockToCsv,
  updateSkuMeta,
} from '@/lib/inventory';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** GET /api/inventory — stock; ?low=1 &q= &format=csv &moves=1 &summary=1 */
export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL not set', code: 'missing_env' },
        { status: 503 }
      );
    }

    const sp = req.nextUrl.searchParams;

    if (sp.get('summary') === '1') {
      const summary = await inventorySummary();
      return NextResponse.json({ ok: true, ...summary });
    }

    const stock = await listStock({
      lowOnly: sp.get('low') === '1',
      q: sp.get('q') || undefined,
    });

    if (sp.get('format') === 'csv') {
      const csv = stockToCsv(stock);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="pharmacy-inventory.csv"',
        },
      });
    }

    const wantMoves = sp.get('moves') === '1';
    const moves = wantMoves
      ? await listMoves({
          move_type: sp.get('move_type') || undefined,
          limit: 40,
        })
      : undefined;

    const low = stock.filter((s) => s.is_low);
    return NextResponse.json({
      ok: true,
      count: stock.length,
      low_count: low.length,
      stock,
      moves,
    });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/inventory
 * receive | adjust | return | write_off | seed_formulary | update_meta
 */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', code: 'unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || body.move_type || 'receive');

    if (action === 'seed_formulary') {
      const result = await seedSkusFromFormulary();
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === 'update_meta') {
      if (!body.sku_id) {
        return NextResponse.json(
          { ok: false, error: 'sku_id required' },
          { status: 400 }
        );
      }
      await updateSkuMeta({
        skuId: String(body.sku_id),
        min_qty: body.min_qty != null ? Number(body.min_qty) : undefined,
        unit: body.unit ? String(body.unit) : undefined,
        is_active: body.is_active != null ? Boolean(body.is_active) : undefined,
        notes: body.notes ? String(body.notes) : undefined,
      });
      return NextResponse.json({ ok: true });
    }

    if (!['receive', 'adjust', 'return', 'write_off'].includes(action)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'action must be receive|adjust|return|write_off|seed_formulary|update_meta',
        },
        { status: 400 }
      );
    }

    const result = await applyMove({
      drugName: body.drug_name ? String(body.drug_name) : undefined,
      skuId: body.sku_id ? String(body.sku_id) : undefined,
      move_type: action as 'receive' | 'adjust' | 'return' | 'write_off',
      qty: Number(body.qty) || 0,
      signedQty: body.signed_qty != null ? Number(body.signed_qty) : undefined,
      actor: body.actor ? String(body.actor) : 'inventory-ui',
      notes: body.notes ? String(body.notes) : undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
