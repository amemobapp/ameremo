import './globals.css'

export const metadata = {
  title: 'アメモバ Google口コミモニター',
  description: 'アメモバ各店舗のGoogle口コミをモニターするシステム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="antialiased font-sans">{children}</body>
    </html>
  )
}
