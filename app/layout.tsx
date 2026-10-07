import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SetupBanner } from './SetupBanner';
import { AppNav } from './AppNav';
import { MobilePublicNav } from './MobilePublicNav';
import { SplashScreen } from './SplashScreen';
import { InstallPrompt } from './InstallPrompt';
import { RegisterSW } from './RegisterSW';

export const metadata: Metadata = {
  title: {
    default: 'Medical Aid — Submit & track monthly treatment',
    template: '%s · Medical Aid',
  },
  description:
    'Submit a monthly treatment request and check status with your Request ID. دعم العلاج الشهري.',
  applicationName: 'Medical Aid',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Medical Aid',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    apple: [{ url: '/apple-icon', type: 'image/png' }],
  },
  other: {
    'apple-touch-startup-image': '/splash',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#059669' },
    { media: '(prefers-color-scheme: dark)', color: '#047857' },
  ],
  viewportFit: 'cover',
};

const APPLE_SPLASH = [
  { w: 1290, h: 2796, media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
  { w: 1170, h: 2532, media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
  { w: 828, h: 1792, media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
  { w: 750, h: 1334, media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
  { w: 1640, h: 2360, media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)' },
] as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {APPLE_SPLASH.map((s) => (
          <link
            key={`${s.w}x${s.h}`}
            rel="apple-touch-startup-image"
            href={`/splash?w=${s.w}&h=${s.h}`}
            media={s.media}
          />
        ))}
      </head>
      <body className="min-h-screen bg-slate-50 antialiased">
        <RegisterSW />
        <SplashScreen />
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
        <div id="main-content" className="pb-24 md:pb-6">
          {children}
        </div>
        <MobilePublicNav />
        <InstallPrompt />
      </body>
    </html>
  );
}
