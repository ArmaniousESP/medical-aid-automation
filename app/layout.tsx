import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SetupBanner } from './SetupBanner';
import { AppNav } from './AppNav';
import { MobilePublicNav } from './MobilePublicNav';
import { SplashScreen } from './SplashScreen';
import { InstallPrompt } from './InstallPrompt';
import { RegisterSW } from './RegisterSW';
import { SiteFooter } from './SiteFooter';

export const metadata: Metadata = {
  title: {
    default: 'Medical Aid — Monthly chronic medicine support',
    template: '%s · Medical Aid',
  },
  description:
    'Production-grade platform for employer chronic medicine programs: submit requests, track status, employee self-service, pharmacy routing, and multi-organization ops. دعم العلاج الشهري.',
  applicationName: 'Medical Aid',
  keywords: [
    'medical aid',
    'chronic medicine',
    'employee benefits',
    'pharmacy',
    'Egypt',
    'دعم العلاج الشهري',
  ],
  authors: [{ name: 'Medical Aid' }],
  openGraph: {
    title: 'Medical Aid — Monthly chronic medicine support',
    description:
      'Submit, track, and fulfill monthly treatment support — private, bilingual, multi-organization.',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ar_EG'],
  },
  twitter: {
    card: 'summary',
    title: 'Medical Aid',
    description: 'Monthly chronic medicine support for employees and families.',
  },
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
    { media: '(prefers-color-scheme: light)', color: '#0f6e56' },
    { media: '(prefers-color-scheme: dark)', color: '#0b5744' },
  ],
  viewportFit: 'cover',
};

const APPLE_SPLASH = [
  {
    w: 1290,
    h: 2796,
    media:
      '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
  },
  {
    w: 1170,
    h: 2532,
    media:
      '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
  },
  {
    w: 828,
    h: 1792,
    media:
      '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
  },
  {
    w: 750,
    h: 1334,
    media:
      '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
  },
  {
    w: 1640,
    h: 2360,
    media:
      '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)',
  },
] as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {APPLE_SPLASH.map((s) => (
          <link
            key={`${s.w}x${s.h}`}
            rel="apple-touch-startup-image"
            href={`/splash?w=${s.w}&h=${s.h}`}
            media={s.media}
          />
        ))}
      </head>
      <body className="min-h-screen antialiased text-slate-900 flex flex-col">
        <RegisterSW />
        <SplashScreen />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <AppNav />
        <div className="mx-auto max-w-6xl px-4 pt-3 w-full">
          <SetupBanner />
        </div>
        <div id="main-content" className="flex-1 pb-24 md:pb-8">
          {children}
        </div>
        <div className="hidden md:block">
          <SiteFooter />
        </div>
        <MobilePublicNav />
        <InstallPrompt />
      </body>
    </html>
  );
}
