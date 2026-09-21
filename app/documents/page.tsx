import Link from 'next/link';
import {
  DOC_TYPE_LABELS_AR,
  documentsSummary,
  listDocuments,
} from '@/lib/documents';
import { RegisterDocForm } from './RegisterDocForm';
import { ImportDocsButton } from './ImportDocsButton';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { doc_type?: string; q?: string };
}) {
  const doc_type = searchParams.doc_type || undefined;
  const q = searchParams.q || undefined;

  let docs: Awaited<ReturnType<typeof listDocuments>> = [];
  let summary: Awaited<ReturnType<typeof documentsSummary>> | null = null;
  let error: string | null = null;

  try {
    docs = await listDocuments({ doc_type, q, limit: 200 });
    summary = await documentsSummary();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'فشل';
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">نظام التوثيق الطبي</h1>
            <p className="text-sm text-slate-600">
              روشتات · تحاليل · كارنيه · فواتير · مرفقات البرامج المزمنة
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/requests" className="text-blue-600 hover:underline">
              الطلبات
            </Link>
            <Link href="/programs" className="text-blue-600 hover:underline">
              البرامج
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-xs text-slate-500">مستندات</div>
              <div className="text-xl font-semibold">{summary.total}</div>
            </div>
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-xs text-slate-500">برامج بمرفقات</div>
              <div className="text-xl font-semibold">
                {summary.programs_with_docs}
              </div>
            </div>
            {Object.entries(summary.by_type)
              .slice(0, 4)
              .map(([t, n]) => (
                <Link
                  key={t}
                  href={`/documents?doc_type=${t}`}
                  className="rounded-lg border bg-white p-3 shadow-sm hover:border-blue-300"
                >
                  <div className="text-xs text-slate-500">
                    {DOC_TYPE_LABELS_AR[t] || t}
                  </div>
                  <div className="text-xl font-semibold">{n}</div>
                </Link>
              ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center text-sm">
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={q || ''}
              placeholder="بحث برنامج / مريض / رابط"
              className="rounded border px-2 py-1.5 min-w-[200px]"
            />
            {doc_type && (
              <input type="hidden" name="doc_type" value={doc_type} />
            )}
            <button
              type="submit"
              className="rounded bg-slate-800 px-3 py-1.5 text-white"
            >
              بحث
            </button>
          </form>
          <ImportDocsButton />
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/documents"
            className={`rounded-full px-3 py-1 border ${
              !doc_type
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white'
            }`}
          >
            الكل
          </Link>
          {Object.entries(DOC_TYPE_LABELS_AR).map(([t, label]) => (
            <Link
              key={t}
              href={`/documents?doc_type=${t}`}
              className={`rounded-full px-3 py-1 border ${
                doc_type === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <RegisterDocForm />

        {error && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            {error}
          </div>
        )}

        <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-2">النوع</th>
                <th className="p-2">المريض / الموظف</th>
                <th className="p-2">البرنامج</th>
                <th className="p-2">المستند</th>
                <th className="p-2">تاريخ</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                      {d.doc_type_ar}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="font-medium">{d.patient_name || '—'}</div>
                    <div className="text-xs text-slate-500">
                      {d.employee_name} · {d.employee_id}
                    </div>
                  </td>
                  <td className="p-2 font-mono text-xs">
                    {d.program_code ? (
                      <Link
                        href={`/programs/${d.entity_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {d.program_code}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-2 max-w-[240px]">
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs break-all"
                    >
                      {d.file_name ||
                        (d.url.includes('drive.google.com')
                          ? 'Google Drive'
                          : d.url.slice(0, 48))}
                    </a>
                  </td>
                  <td className="p-2 text-xs text-slate-500 whitespace-nowrap">
                    {d.issued_at
                      ? String(d.issued_at).slice(0, 10)
                      : String(d.created_at).slice(0, 10)}
                  </td>
                </tr>
              ))}
              {docs.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    لا مستندات بعد — سجّل رابطاً أو استورد من ملاحظات البرامج
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
