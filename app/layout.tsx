import type { Metadata } from 'next';
import './globals.css';
import { SetupBanner } from './SetupBanner';

export const metadata: Metadata = {
  title: 'Medical Aid Automation',
  description: 'Process monthly medical aid form responses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar">
      <body>
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <SetupBanner />
        </div>
        {children}
      </body>
    </html>
  );
}
