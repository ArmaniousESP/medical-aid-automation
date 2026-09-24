/** Annotated UI mock frames for the how-to guide */

type Callout = { n: number; label: string; labelAr?: string };

function Frame({
  title,
  children,
  callouts,
  accent = 'emerald',
}: {
  title: string;
  children: React.ReactNode;
  callouts: Callout[];
  accent?: 'emerald' | 'violet';
}) {
  const ring =
    accent === 'emerald' ? 'ring-emerald-200' : 'ring-violet-200';
  const badge =
    accent === 'emerald' ? 'bg-emerald-600' : 'bg-violet-700';

  return (
    <div className="mt-3 space-y-2">
      <div
        className={`rounded-lg border bg-slate-100 p-2 shadow-inner ring-1 ${ring}`}
      >
        <div className="mb-1.5 flex items-center gap-1.5 px-1">
          <span className="h-2 w-2 rounded-full bg-red-300" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          <span className="ml-2 text-[10px] text-slate-400 font-mono truncate">
            {title}
          </span>
        </div>
        <div className="rounded-md border bg-white p-3 text-left shadow-sm">
          {children}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
        {callouts.map((c) => (
          <li key={c.n} className="inline-flex items-center gap-1">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${badge}`}
            >
              {c.n}
            </span>
            <span>
              {c.label}
              {c.labelAr ? (
                <span className="text-slate-400" dir="rtl">
                  {' '}
                  · {c.labelAr}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Dot({ n, accent = 'emerald' }: { n: number; accent?: 'emerald' | 'violet' }) {
  const bg = accent === 'emerald' ? 'bg-emerald-600' : 'bg-violet-700';
  return (
    <span
      className={`absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow ${bg}`}
    >
      {n}
    </span>
  );
}

export function MockSubmit() {
  return (
    <Frame
      title="/intake — submit form"
      accent="emerald"
      callouts={[
        { n: 1, label: 'Employee & patient fields', labelAr: 'بيانات الموظف والمريض' },
        { n: 2, label: 'Medicine name + qty', labelAr: 'الدواء والكمية' },
        { n: 3, label: 'Submit button', labelAr: 'إرسال' },
      ]}
    >
      <div className="space-y-2 text-[11px]">
        <div className="relative inline-block w-full">
          <Dot n={1} />
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded border bg-slate-50 px-2 py-1 text-slate-400">
              اسم الموظف *
            </div>
            <div className="rounded border bg-slate-50 px-2 py-1 text-slate-400">
              الرقم الوظيفي
            </div>
            <div className="col-span-2 rounded border bg-slate-50 px-2 py-1 text-slate-400">
              اسم المريض
            </div>
          </div>
        </div>
        <div className="relative">
          <Dot n={2} />
          <div className="flex gap-1">
            <div className="flex-1 rounded border bg-slate-50 px-2 py-1 text-slate-400">
              اسم الدواء
            </div>
            <div className="w-10 rounded border bg-slate-50 px-1 py-1 text-center text-slate-400">
              1
            </div>
          </div>
        </div>
        <div className="relative inline-block w-full">
          <Dot n={3} />
          <div className="rounded-md bg-emerald-600 py-1.5 text-center font-medium text-white">
            إرسال الطلب على المنصة
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function MockStatus() {
  return (
    <Frame
      title="/request-status — lookup"
      accent="emerald"
      callouts={[
        { n: 1, label: 'Paste Request ID', labelAr: 'رقم الطلب' },
        { n: 2, label: 'Optional phone / emp ID', labelAr: 'تحقق إضافي' },
        { n: 3, label: 'Status result (masked)', labelAr: 'النتيجة' },
      ]}
    >
      <div className="space-y-2 text-[11px]">
        <div className="relative">
          <Dot n={1} />
          <div className="rounded border bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-500">
            xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
          </div>
        </div>
        <div className="relative grid grid-cols-2 gap-1">
          <Dot n={2} />
          <div className="rounded border bg-slate-50 px-2 py-1 text-slate-400">Phone</div>
          <div className="rounded border bg-slate-50 px-2 py-1 text-slate-400">Emp ID</div>
        </div>
        <div className="rounded-md bg-slate-800 py-1.5 text-center text-white">
          Check status
        </div>
        <div className="relative rounded border border-emerald-200 bg-emerald-50 p-2">
          <Dot n={3} />
          <div className="font-medium text-emerald-900">تم الاستلام · Received</div>
          <div className="text-[10px] text-emerald-800">Employee: Ahmed A***</div>
        </div>
      </div>
    </Frame>
  );
}

export function MockUnlock() {
  return (
    <Frame
      title="/ — Home unlock"
      accent="violet"
      callouts={[
        { n: 1, label: 'Public actions (no unlock)', labelAr: 'للمستفيد' },
        { n: 2, label: 'Ops password field', labelAr: 'كلمة سر التشغيل' },
        { n: 3, label: 'Unlock ops', labelAr: 'فتح' },
      ]}
    >
      <div className="space-y-2 text-[11px]">
        <div className="relative space-y-1">
          <Dot n={1} accent="violet" />
          <div className="rounded-md bg-emerald-600 py-1.5 text-center text-white">
            1 · Submit a request
          </div>
          <div className="rounded-md border py-1.5 text-center">2 · Check status</div>
        </div>
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-2 space-y-1">
          <div className="text-[10px] text-slate-500 text-center">Staff only</div>
          <div className="relative flex gap-1">
            <Dot n={2} accent="violet" />
            <div className="flex-1 rounded border bg-white px-2 py-1 text-slate-400">
              ••••••••
            </div>
            <div className="relative">
              <Dot n={3} accent="violet" />
              <div className="rounded bg-slate-800 px-2 py-1 text-white">Unlock</div>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function MockQueue() {
  return (
    <Frame
      title="/intake-ops — queue"
      accent="violet"
      callouts={[
        { n: 1, label: 'Filter: submitted', labelAr: 'تصفية' },
        { n: 2, label: 'Process platform intake', labelAr: 'تشغيل المعالجة' },
        { n: 3, label: 'Request rows', labelAr: 'الطلبات' },
      ]}
    >
      <div className="space-y-2 text-[11px]">
        <div className="relative flex flex-wrap gap-1">
          <Dot n={1} accent="violet" />
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-white">submitted</span>
          <span className="rounded-full border px-2 py-0.5 text-slate-500">all</span>
          <span className="rounded-full border px-2 py-0.5 text-slate-500">enrolled</span>
        </div>
        <div className="relative">
          <Dot n={2} accent="violet" />
          <div className="rounded-md bg-violet-700 py-1.5 text-center font-medium text-white">
            Process platform intake
          </div>
        </div>
        <div className="relative rounded border overflow-hidden">
          <Dot n={3} accent="violet" />
          <div className="bg-slate-50 px-2 py-1 text-[10px] text-slate-500 grid grid-cols-3 gap-1">
            <span>Status</span>
            <span>Employee</span>
            <span>Patient</span>
          </div>
          <div className="px-2 py-1 grid grid-cols-3 gap-1 border-t">
            <span className="text-amber-700">submitted</span>
            <span>Sara M***</span>
            <span>same</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function MockClaims() {
  return (
    <Frame
      title="/claims — drafts"
      accent="violet"
      callouts={[
        { n: 1, label: 'Filter: draft', labelAr: 'مسودات' },
        { n: 2, label: 'Amount', labelAr: 'المبلغ' },
        { n: 3, label: 'Submit claim', labelAr: 'إرسال' },
      ]}
    >
      <div className="space-y-2 text-[11px]">
        <div className="relative flex gap-1">
          <Dot n={1} accent="violet" />
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-white">draft</span>
          <span className="rounded-full border px-2 py-0.5 text-slate-500">submitted</span>
        </div>
        <div className="relative rounded border p-2 flex justify-between items-center">
          <div>
            <div className="font-mono text-[10px]">CLM-2026-…</div>
            <div className="text-slate-500">Patient A***</div>
          </div>
          <div className="relative text-right">
            <Dot n={2} accent="violet" />
            <div className="font-medium">1,250 EGP</div>
            <div className="relative inline-block mt-1">
              <Dot n={3} accent="violet" />
              <span className="text-indigo-700 underline">Submit</span>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function MockPharmacy() {
  return (
    <Frame
      title="/pharmacy — pick list"
      accent="violet"
      callouts={[
        { n: 1, label: 'EVA / NOT EVA filter', labelAr: 'تصفية الصيدلية' },
        { n: 2, label: 'Patient group', labelAr: 'المريض' },
        { n: 3, label: 'Drug lines + qty', labelAr: 'الأدوية' },
      ]}
    >
      <div className="space-y-2 text-[11px]">
        <div className="relative flex flex-wrap gap-1">
          <Dot n={1} accent="violet" />
          <span className="rounded-full bg-teal-600 px-2 py-0.5 text-white">All</span>
          <span className="rounded-full border px-2 py-0.5">EVA</span>
          <span className="rounded-full border px-2 py-0.5">NOT EVA</span>
        </div>
        <div className="relative rounded border overflow-hidden">
          <Dot n={2} accent="violet" />
          <div className="bg-slate-100 px-2 py-1 font-medium">Patient M***</div>
          <div className="relative px-2 py-1 border-t text-[10px] flex justify-between">
            <Dot n={3} accent="violet" />
            <span>Drug A · qty 2</span>
            <span className="text-emerald-700">EVA</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function mockForStep(
  kind: 'submit' | 'status' | 'unlock' | 'queue' | 'claims' | 'pharmacy'
) {
  switch (kind) {
    case 'submit':
      return <MockSubmit />;
    case 'status':
      return <MockStatus />;
    case 'unlock':
      return <MockUnlock />;
    case 'queue':
      return <MockQueue />;
    case 'claims':
      return <MockClaims />;
    case 'pharmacy':
      return <MockPharmacy />;
  }
}
