import { NextRequest, NextResponse } from 'next/server';
import {
  deleteDocument,
  documentsSummary,
  importLinksFromProgramNotes,
  listDocuments,
  registerDocument,
} from '@/lib/documents';
import { authorizeRequest } from '@/lib/auth';
import { jsonError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** GET /api/documents?doc_type=&program_id=&q=&summary=1 */
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
      const summary = await documentsSummary();
      return NextResponse.json({ ok: true, ...summary });
    }

    const docs = await listDocuments({
      doc_type: sp.get('doc_type') || undefined,
      program_id: sp.get('program_id') || undefined,
      q: sp.get('q') || undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : 100,
    });

    return NextResponse.json({ ok: true, count: docs.length, documents: docs });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

/** POST register | import_notes */
export async function POST(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', code: 'unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'register');

    if (action === 'import_notes') {
      const result = await importLinksFromProgramNotes();
      return NextResponse.json({ ok: true, ...result });
    }

    if (!body.program_id || !body.url) {
      return NextResponse.json(
        { ok: false, error: 'program_id and url required' },
        { status: 400 }
      );
    }

    const result = await registerDocument({
      program_id: String(body.program_id),
      doc_type: String(body.doc_type || 'prescription'),
      url: String(body.url),
      file_name: body.file_name ? String(body.file_name) : undefined,
      issued_at: body.issued_at ? String(body.issued_at) : undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!authorizeRequest(req)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', code: 'unauthorized' },
        { status: 401 }
      );
    }
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
    }
    await deleteDocument(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const { body, status } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
