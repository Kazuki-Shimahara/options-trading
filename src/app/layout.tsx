import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'NK225 Options | 日経225オプション取引サポート',
  description: '日経225オプション取引の記録・分析・シグナル通知アプリ',
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NK225 Options',
  },
  icons: {
    apple: [{ url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-touch-icon': '/icon-192x192.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-slate-100 min-h-screen`}
      >
        <ServiceWorkerRegister />
        <div className="pb-safe-bottom">{children}</div>
        <BottomNav />
      </body>
    </html>
  )
}
