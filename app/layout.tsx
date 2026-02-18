import './globals.css'
import localFont from 'next/font/local'

const glowSansMedium = localFont({
  src: '../GlowSansSC-Compressed-Medium.otf',
  variable: '--font-glowsans',
  display: 'swap',
})

const glowSansLight = localFont({
  src: '../GlowSansSC-Compressed-Light.otf',
  variable: '--font-glowsans-light',
  display: 'swap',
})

export const metadata = {
  title: 'アメレモ',
  description: 'アメモバ各店舗のGoogle口コミをモニターするシステム',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={`${glowSansMedium.variable} ${glowSansLight.variable}`}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  )
}
