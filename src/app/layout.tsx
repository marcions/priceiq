import type { Metadata } from 'next'
import NextTopLoader from 'nextjs-toploader'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'PriceIQ — Precificação Inteligente',
  description: 'Motor de precificação para produtos comerciais com integração Bling',
  manifest: '/manifest.json',
  themeColor: '#5750f1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PriceIQ',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap" />
      </head>
      <body className="antialiased">
        <NextTopLoader color="#5750f1" showSpinner={false} />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
