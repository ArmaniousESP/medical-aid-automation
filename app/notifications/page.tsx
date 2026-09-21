import Link from 'next/link';
import { whatsappConfigStatus } from '@/lib/whatsapp';
import { NotifyDueButton } from './NotifyDueButton';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
  const status = whatsappConfigStatus();

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">تنبيهات واتساب</h1>
            <p className="text-sm text-slate-600">
              تذكير الصرف · متابعة الالتزام · سجل الإرسال
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/care-line" className="text-blue-600 hover:underline">
              Care Line
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>

        <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2 text-sm">
          <p>
            <span className="text-slate-500">المزوّد: </span>
            <strong>{status.mode}</strong>
            {status.dry_run_default && (
              <span className="ml-2 text-amber-700">(وضع تجريبي — لا إرسال حقيقي)</span>
            )}
          </p>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>Meta Cloud API: {status.has_meta ? '✓' : '—'} WHATSAPP_TOKEN + PHONE_NUMBER_ID</li>
            <li>Twilio: {status.has_twilio ? '✓' : '—'} TWILIO_* + TWILIO_WHATSAPP_FROM</li>
            <li>Webhook: {status.has_webhook ? '✓' : '—'} WHATSAPP_WEBHOOK_URL</li>
          </ul>
          <p className="text-xs text-slate-500">
            القوالب: {status.templates.join(', ')}
          </p>
        </div>

        <NotifyDueButton />

        <div className="rounded-lg border bg-white p-4 text-sm text-slate-700 space-y-2">
          <p className="font-medium">إعداد سريع (Vercel env)</p>
          <ol className="list-decimal list-inside text-xs space-y-1 text-slate-600">
            <li>أنشئ تطبيق WhatsApp Business على Meta أو حساب Twilio</li>
            <li>أضف المتغيرات في Vercel → Settings → Environment Variables</li>
            <li>اختياري: WHATSAPP_DRY_RUN=1 للتجربة بدون إرسال</li>
            <li>Cron: استدعِ /api/cron/whatsapp-due مع PROCESS_SECRET</li>
          </ol>
          <p className="text-xs text-slate-500">
            ملاحظة Meta: الرسائل خارج نافذة 24 ساعة قد تتطلب قالب Message Template
            معتمد؛ النص الحر يعمل بعد رد المستخدم أو ضمن الجلسة.
          </p>
        </div>
      </div>
    </main>
  );
}
