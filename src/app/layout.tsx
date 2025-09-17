import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import { PinProvider } from '@/lib/pin-context'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Negative Visualization Journal',
  description: 'A privacy-first journal for practicing negative visualization and building resilience',
  viewport: 'width=device-width, initial-scale=1, user-scalable=no',
  themeColor: '#000000',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PinProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </PinProvider>
      </body>
    </html>
  )
}