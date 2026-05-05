import type { Metadata } from 'next'
import React from 'react'

import './styles.css'

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
      <body>{children}</body>
    </html>
  )
}
