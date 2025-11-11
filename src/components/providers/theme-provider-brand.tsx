'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import ThemeManager from '@/lib/theme-manager'

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: string
}

const ThemeContext = createContext<ThemeManager | null>(null)

export function ThemeProvider({ children, defaultTheme = 'default' }: ThemeProviderProps) {
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return
    
    const themeManager = ThemeManager.getInstance()
    
    // Cargar fuentes de Google Fonts
    const loadGoogleFonts = () => {
      if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
        const link = document.createElement('link')
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'
        link.rel = 'stylesheet'
        document.head.appendChild(link)
      }
    }

    // Inicializar el sistema de temas
    const initializeTheme = () => {
      // Cargar tema guardado o usar el por defecto
      const savedTheme = localStorage.getItem('mesa-ayuda-theme')
      if (savedTheme && savedTheme !== 'default') {
        themeManager.applyTheme(savedTheme)
      } else {
        themeManager.applyTheme(defaultTheme)
      }
    }

    loadGoogleFonts()
    initializeTheme()
  }, [defaultTheme])

  return (
    <ThemeContext.Provider value={ThemeManager.getInstance()}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext debe usarse dentro de ThemeProvider')
  }
  return context
}