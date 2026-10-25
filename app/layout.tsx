import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fleet Ops — 站群驾驶舱',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh">
      <body className="min-h-screen bg-background text-ink antialiased">{children}</body>
    </html>
  )
}
