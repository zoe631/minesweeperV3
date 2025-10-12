import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Minesweeper',
  description: 'Just a web app ',
  generator: 'pvplolpvp009',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
