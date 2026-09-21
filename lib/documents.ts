import { query } from '@/lib/db';

/** Standard medical document types for chronic aid */
export const DOC_TYPES = [
  'prescription', // روشتة
  'lab', // تحاليل
  'imaging', // أشعة
  'id_card', // كارنيه / هوية
  'relation_proof', // إثبات قرابة
  'invoice', // فاتورة
  'rejection_letter', // خطاب رفض تأمين
  'other',
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_LABELS_AR: Record<string, string> = {
  prescription: 'روشتة',
  lab: 'تحاليل',
  imaging: 'أشعة',
  id_card: 'كارنيه / هوية',
  relation_proof: 'إثبات قرابة',
  invoice: 'فاتورة',
  rejection_letter: 'خطاب رفض',
  other: 'أخرى',
};

export type MedicalDocument = {
  id: string;
  entity_type: string;
  entity_id: string;
  doc_type: string;
  doc_type_ar: string;
  url: string;
  file_name: string | null;
  issued_at: string | null;
  created_at: string;
  program_code?: string;
  employee_name?: string;
  patient_name?: string;
  employee_id?: string;
};

export async function listDocuments(opts: {
  doc_type?: string;
  program_id?: string;
  q?: string;
  limit?: number;
}): Promise<MedicalDocument[]> {
  const limit = Math.min(opts.limit ?? 100, 500);
  const params: unknown[] = [];
  const where: string[] = [`a.entity_type = 'program'`];

  if (opts.doc_type) {
    params.push(opts.doc_type);
    where.push(`a.doc_type = $${params.length}`);
  }
  if (opts.program_id) {
    params.push(opts.program_id);
    where.push(`a.entity_id = $${params.length}`);
  }
  if (opts.q) {
    params.push(`%${opts.q}%`);
    const i = params.length;
    where.push(
      `(cp.program_code ILIKE $${i} OR e.full_name ILIKE $${i} OR d.full_name ILIKE $${i} OR a.url ILIKE $${i} OR coalesce(a.file_name,'') ILIKE $${i})`
    );
  }

  params.push(limit);

  const res = await query(
    `SELECT
       a.id,
       a.entity_type,
       a.entity_id,
       a.doc_type,
       a.url,
       a.file_name,
       a.issued_at,
       a.created_at,
       cp.program_code,
       e.full_name AS employee_name,
       e.external_employee_id AS employee_id,
       d.full_name AS patient_name
     FROM attachments a
     LEFT JOIN chronic_programs cp ON cp.id = a.entity_id AND a.entity_type = 'program'
     LEFT JOIN employees e ON e.id = cp.employee_id
     LEFT JOIN dependents d ON d.id = cp.dependent_id
     WHERE ${where.join(' AND ')}
     ORDER BY a.created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return (res.rows as any[]).map((r) => ({
    id: r.id,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    doc_type: r.doc_type,
    doc_type_ar: DOC_TYPE_LABELS_AR[r.doc_type] || r.doc_type,
    url: r.url,
    file_name: r.file_name,
    issued_at: r.issued_at,
    created_at: r.created_at,
    program_code: r.program_code,
    employee_name: r.employee_name,
    patient_name: r.patient_name,
    employee_id: r.employee_id,
  }));
}

export async function documentsSummary() {
  const byType = await query<{ doc_type: string; n: string }>(
    `SELECT doc_type, count(*)::text AS n FROM attachments GROUP BY doc_type ORDER BY count(*) DESC`
  );
  const total = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM attachments`
  );
  const programsWithDocs = await query<{ n: string }>(
    `SELECT count(DISTINCT entity_id)::text AS n
     FROM attachments WHERE entity_type = 'program'`
  );

  return {
    total: Number(total.rows[0]?.n) || 0,
    programs_with_docs: Number(programsWithDocs.rows[0]?.n) || 0,
    by_type: Object.fromEntries(
      byType.rows.map((r) => [r.doc_type, Number(r.n)])
    ),
  };
}

export async function registerDocument(input: {
  program_id: string;
  doc_type: string;
  url: string;
  file_name?: string;
  issued_at?: string;
}) {
  const docType = DOC_TYPES.includes(input.doc_type as DocType)
    ? input.doc_type
    : 'other';
  const url = input.url.trim();
  if (!url) throw new Error('url required');

  const prog = await query(`SELECT id FROM chronic_programs WHERE id = $1`, [
    input.program_id,
  ]);
  if (!prog.rows[0]) throw new Error('program not found');

  const existing = await query(
    `SELECT id FROM attachments
     WHERE entity_type = 'program' AND entity_id = $1 AND doc_type = $2 AND url = $3
     LIMIT 1`,
    [input.program_id, docType, url]
  );
  if (existing.rows[0]) {
    return { id: (existing.rows[0] as any).id, created: false };
  }

  const ins = await query<{ id: string }>(
    `INSERT INTO attachments (entity_type, entity_id, doc_type, url, file_name, issued_at)
     VALUES ('program', $1, $2, $3, $4, $5)
     RETURNING id`,
    [
      input.program_id,
      docType,
      url,
      input.file_name || null,
      input.issued_at || null,
    ]
  );
  return { id: ins.rows[0].id, created: true };
}

export async function deleteDocument(id: string) {
  await query(`DELETE FROM attachments WHERE id = $1`, [id]);
}

/**
 * Pull Drive links from program notes / source text patterns (روشتة: url).
 * Idempotent.
 */
export async function importLinksFromProgramNotes() {
  const progs = await query<{ id: string; notes: string | null }>(
    `SELECT id, notes FROM chronic_programs WHERE notes IS NOT NULL AND notes <> ''`
  );

  let created = 0;
  let skipped = 0;

  const urlRe = /https?:\/\/[^\s|,]+/g;

  for (const p of progs.rows) {
    const notes = p.notes || '';
    const urls = notes.match(urlRe) || [];
    for (const raw of urls) {
      const url = raw.replace(/[)\\]+$/, '');
      let docType: DocType = 'other';
      if (/روشتة|prescription|roshetta/i.test(notes) || /drive\.google/i.test(url)) {
        docType = 'prescription';
      }
      if (/تحليل|lab/i.test(notes)) docType = 'lab';
      if (/كارنيه|card/i.test(notes)) docType = 'id_card';
      if (/قرابة|relation/i.test(notes)) docType = 'relation_proof';
      if (/رفض|rejection/i.test(notes)) docType = 'rejection_letter';

      const r = await registerDocument({
        program_id: p.id,
        doc_type: docType,
        url,
      });
      if (r.created) created += 1;
      else skipped += 1;
    }
  }

  return { programs_scanned: progs.rows.length, created, skipped };
}
