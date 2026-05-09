import type { Metadata } from 'next'
import { Barlow_Condensed, Noto_Sans_SC } from 'next/font/google'
import React from 'react'

import './styles.css'

const displayFont = Barlow_Condensed({
  display: 'swap',
  fallback: ['Arial Narrow', 'Arial', 'sans-serif'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display-loaded',
  weight: ['300', '400', '500', '600', '700', '800'],
})

const bodyFont = Noto_Sans_SC({
  display: 'swap',
  fallback: ['PingFang SC', 'Microsoft YaHei', 'Arial', 'sans-serif'],
  subsets: ['latin'],
  variable: '--font-body-loaded',
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  description: 'East Asia Power builds storage and grid flexibility systems for volatile grids.',
  icons: {
    icon: '/icon.svg',
  },
  title: 'East Asia Power',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  )
}
