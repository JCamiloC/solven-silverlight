/**
 * CONFIGURADOR DE TEMAS CORPORATIVOS
 * Sistema para personalizar la aplicación según el cliente/licitación
 */

export interface BrandTheme {
  id: string
  name: string
  description: string
  colors: {
    primary: string
    secondary: string
    accent: string
    success: string
    warning: string
    error: string
    info: string
  }
  fonts: {
    primary: string
    secondary: string
    headings: string
  }
  logo?: {
    light: string
    dark: string
    favicon: string
  }
  spacing?: {
    scale: number // Multiplicador para espaciado
  }
  borderRadius?: {
    scale: number // Multiplicador para border-radius
  }
}

// ========================================
// TEMAS PREDEFINIDOS PARA LICITACIONES
// ========================================

export const brandThemes: Record<string, BrandTheme> = {
  default: {
    id: 'default',
    name: 'Mesa de Ayuda - Default',
    description: 'Tema por defecto profesional y moderno',
    colors: {
      primary: '#0ea5e9',
      secondary: '#64748b',
      accent: '#dc2626',
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#dc2626',
      info: '#0ea5e9'
    },
    fonts: {
      primary: 'Inter',
      secondary: 'JetBrains Mono',
      headings: 'Inter'
    }
  },

  gobierno: {
    id: 'gobierno',
    name: 'Gobierno de Colombia',
    description: 'Tema institucional para entidades gubernamentales',
    colors: {
      primary: '#003f7f',      // Azul institucional
      secondary: '#ffd700',    // Amarillo Colombia
      accent: '#dc2626',       // Rojo alerta
      success: '#16a34a',      // Verde éxito
      warning: '#ca8a04',      // Amarillo advertencia
      error: '#dc2626',        // Rojo error
      info: '#003f7f'          // Azul información
    },
    fonts: {
      primary: 'Inter',
      secondary: 'JetBrains Mono',
      headings: 'Inter'
    },
    logo: {
      light: '/logos/gobierno-light.svg',
      dark: '/logos/gobierno-dark.svg',
      favicon: '/favicons/gobierno.ico'
    }
  },

  bancario: {
    id: 'bancario',
    name: 'Sector Bancario',
    description: 'Tema profesional para instituciones financieras',
    colors: {
      primary: '#1e40af',      // Azul confianza
      secondary: '#64748b',    // Gris profesional
      accent: '#059669',       // Verde financiero
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#dc2626',
      info: '#1e40af'
    },
    fonts: {
      primary: 'Inter',
      secondary: 'JetBrains Mono',
      headings: 'Inter'
    },
    spacing: {
      scale: 1.1 // Más espacioso para sensación premium
    }
  },

  salud: {
    id: 'salud',
    name: 'Sector Salud',
    description: 'Tema para instituciones de salud y hospitales',
    colors: {
      primary: '#059669',      // Verde salud
      secondary: '#0ea5e9',    // Azul médico
      accent: '#dc2626',       // Rojo urgencia
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#dc2626',
      info: '#0ea5e9'
    },
    fonts: {
      primary: 'Inter',
      secondary: 'JetBrains Mono',
      headings: 'Inter'
    }
  },

  educacion: {
    id: 'educacion',
    name: 'Sector Educativo',
    description: 'Tema para universidades e instituciones educativas',
    colors: {
      primary: '#7c3aed',      // Púrpura académico
      secondary: '#64748b',    // Gris neutro
      accent: '#dc2626',       // Rojo alerta
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#dc2626',
      info: '#7c3aed'
    },
    fonts: {
      primary: 'Inter',
      secondary: 'JetBrains Mono',
      headings: 'Inter'
    }
  },

  corporativo: {
    id: 'corporativo',
    name: 'Corporativo Premium',
    description: 'Tema elegante para empresas privadas',
    colors: {
      primary: '#0f172a',      // Negro corporativo
      secondary: '#64748b',    // Gris elegante
      accent: '#0ea5e9',       // Azul accent
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#dc2626',
      info: '#0ea5e9'
    },
    fonts: {
      primary: 'Inter',
      secondary: 'JetBrains Mono',
      headings: 'Inter'
    },
    spacing: {
      scale: 1.2 // Más generoso para sensación premium
    },
    borderRadius: {
      scale: 0.8 // Bordes más sutiles
    }
  }
}

// ========================================
// FUNCIONES DE GESTIÓN DE TEMAS
// ========================================

export class ThemeManager {
  private static instance: ThemeManager
  private currentTheme: string = 'default'

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager()
    }
    return ThemeManager.instance
  }

  /**
   * Aplicar tema al documento
   */
  applyTheme(themeId: string): void {
    const theme = brandThemes[themeId]
    if (!theme) {
      console.warn(`Tema '${themeId}' no encontrado`)
      return
    }

    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') {
      this.currentTheme = themeId
      return
    }

    const root = document.documentElement
    
    // Aplicar colores
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--brand-${key}`, value)
    })

    // Aplicar fuentes
    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key}`, value)
    })

    // Aplicar escalas de espaciado y border-radius si están definidas
    if (theme.spacing?.scale) {
      root.style.setProperty('--spacing-scale', theme.spacing.scale.toString())
    }

    if (theme.borderRadius?.scale) {
      root.style.setProperty('--border-radius-scale', theme.borderRadius.scale.toString())
    }

    // Aplicar data-theme al body para CSS específico
    document.body.setAttribute('data-theme', themeId)
    
    // Cambiar favicon si está definido
    if (theme.logo?.favicon) {
      this.updateFavicon(theme.logo.favicon)
    }

    this.currentTheme = themeId
    
    // Guardar preferencia en localStorage
    localStorage.setItem('mesa-ayuda-theme', themeId)

    console.log(`Tema '${theme.name}' aplicado correctamente`)
  }

  /**
   * Obtener tema actual
   */
  getCurrentTheme(): BrandTheme {
    return brandThemes[this.currentTheme] || brandThemes.default
  }

  /**
   * Obtener ID del tema actual
   */
  getCurrentThemeId(): string {
    return this.currentTheme
  }

  /**
   * Cargar tema desde localStorage
   */
  loadSavedTheme(): void {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return
    
    const savedTheme = localStorage.getItem('mesa-ayuda-theme')
    if (savedTheme && brandThemes[savedTheme]) {
      this.applyTheme(savedTheme)
    }
  }

  /**
   * Obtener todos los temas disponibles
   */
  getAvailableThemes(): BrandTheme[] {
    return Object.values(brandThemes)
  }

  /**
   * Actualizar favicon
   */
  private updateFavicon(faviconUrl: string): void {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || 
                 document.createElement('link')
    link.type = 'image/x-icon'
    link.rel = 'shortcut icon'
    link.href = faviconUrl
    document.getElementsByTagName('head')[0].appendChild(link)
  }

  /**
   * Generar CSS personalizado para un tema
   */
  generateThemeCSS(themeId: string): string {
    const theme = brandThemes[themeId]
    if (!theme) return ''

    return `
      [data-theme="${themeId}"] {
        ${Object.entries(theme.colors).map(([key, value]) => 
          `--brand-${key}: ${value};`
        ).join('\n        ')}
        
        ${Object.entries(theme.fonts).map(([key, value]) => 
          `--font-${key}: "${value}";`
        ).join('\n        ')}
        
        ${theme.spacing?.scale ? `--spacing-scale: ${theme.spacing.scale};` : ''}
        ${theme.borderRadius?.scale ? `--border-radius-scale: ${theme.borderRadius.scale};` : ''}
      }
    `
  }
}

// ========================================
// REACT HOOK PARA GESTIÓN DE TEMAS
// ========================================

import { useState, useEffect } from 'react'

export function useTheme() {
  const [themeManager] = useState(() => ThemeManager.getInstance())
  const [currentTheme, setCurrentTheme] = useState('default') // Inicializar con valor por defecto
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Solo cargar tema después de montar en el cliente
    themeManager.loadSavedTheme()
    setCurrentTheme(themeManager.getCurrentThemeId())
  }, [themeManager])

  const changeTheme = (themeId: string) => {
    if (!mounted) return // Prevenir cambios antes del montaje
    themeManager.applyTheme(themeId)
    setCurrentTheme(themeId)
  }

  return {
    currentTheme: themeManager.getCurrentTheme(),
    currentThemeId: currentTheme,
    availableThemes: themeManager.getAvailableThemes(),
    changeTheme,
    mounted
  }
}

export default ThemeManager