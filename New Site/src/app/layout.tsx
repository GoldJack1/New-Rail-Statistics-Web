import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { geologica, aronetiv, aronetivNormal } from './fonts'
import { AuthProvider } from '@/contexts/AuthContext'
import { StationCollectionProvider } from '@/contexts/StationCollectionContext'
import { PendingStationChangesProvider } from '@/contexts/PendingStationChangesContext'
import Header from '@/components/misc/Header/Header'
import Footer from '@/components/misc/Footer/Footer'
import AppMain from '@/components/misc/AppMain'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rail Statistics',
  description: 'Rail Statistics - Track your railway station visits and statistics',
  keywords: ['rail', 'statistics', 'railway', 'stations', 'tracking'],
  authors: [{ name: 'Rail Statistics' }],
  icons: {
    icon: [
      { url: '/favicon.svg?v=1', type: 'image/svg+xml' },
      { url: '/favicon.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png?v=2',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Rail Statistics',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  interactiveWidget: 'overlays-content',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e8eaed' },
    { media: '(prefers-color-scheme: dark)', color: '#22252d' },
  ],
}

/**
 * Runs before paint to set `data-theme` (and iOS status bar meta) from
 * localStorage, matching the old site's `applyStoredThemeToDocument()`
 * (src/hooks/useTheme.ts) so there is no light→dark flash on load.
 */
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem('theme');
    var theme = raw === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    var appleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatus) {
      appleStatus.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default');
    }
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geologica.variable} ${aronetiv.variable} ${aronetivNormal.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body>
        <AuthProvider>
          <StationCollectionProvider>
            <PendingStationChangesProvider>
              <div className="app">
                <Header />
                <AppMain>{children}</AppMain>
                <Suspense fallback={null}>
                  <Footer />
                </Suspense>
              </div>
            </PendingStationChangesProvider>
          </StationCollectionProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
