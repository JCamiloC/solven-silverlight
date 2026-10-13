'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

const STORAGE_KEY = 'solven-color-mode'

export function ColorModeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={STORAGE_KEY}
      disableTransitionOnChange={false}
    >
      {children}
    </ThemeProvider>
  )
}
