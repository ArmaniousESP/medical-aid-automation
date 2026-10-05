import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SetupBanner } from './SetupBanner';
import { AppNav } from './AppNav';
import { MobilePublicNav } from './MobilePublicNav';

export const metadata: Metadata = {
  title: {
    default: 'Medical Aid — Submit & track monthly treatment',
    template: '%s · Medical Aid',
  },
  description:
    'Submit a monthly treatment request and check status with your Request ID. دعم العلاج الشهري.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <AppNav />
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <SetupBanner />
        </div>
        <div id="main-content">{children}</div>
        <MobilePublicNav />
      </body>
    </html>
  );
}
