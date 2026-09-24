import type { Metadata } from 'next';
import './globals.css';
import { SetupBanner } from './SetupBanner';
import { AppNav } from './AppNav';

export const metadata: Metadata = {
  title: 'Medical Aid Automation',
  description:
    'Monthly medical aid — platform intake, claims, chronic programs, pharmacy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <AppNav />
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <SetupBanner />
        </div>
        {children}
      </body>
    </html>
  );
}
