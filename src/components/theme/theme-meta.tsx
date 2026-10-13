'use client'

import { useTheme } from 'next-themes'
import { useEffect } from 'react'

/** Sincroniza color-scheme y theme-color móvil con el modo claro/oscuro. */
export function ThemeMeta() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const root = document.documentElement
    const isDark = resolvedTheme === 'dark'
    root.style.colorScheme = isDark ? 'dark' : 'light'

    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = isDark ? '#1a1a1a' : '#24add6'
  }, [resolvedTheme])

  return null
}
