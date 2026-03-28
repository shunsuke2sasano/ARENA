import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ARENA — 実写映像競技プラットフォーム',
  description: '独りよがりでも、迎合でもない。伝わる強さで競う。',
  openGraph: {
    title: 'ARENA',
    description: '独りよがりでも、迎合でもない。伝わる強さで競う。',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-arena-black text-white flex flex-col">
        {children}
      </body>
    </html>
  )
}
