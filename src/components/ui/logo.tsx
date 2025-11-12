'use client'

import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'compact' | 'icon'
  showTagline?: boolean
}

const sizeConfig = {
  sm: {
    text: 'text-lg',
    tagline: 'text-xs',
    container: 'h-8',
  },
  md: {
    text: 'text-xl',
    tagline: 'text-sm',
    container: 'h-10',
  },
  lg: {
    text: 'text-2xl',
    tagline: 'text-base',
    container: 'h-12',
  },
  xl: {
    text: 'text-4xl',
    tagline: 'text-lg',
    container: 'h-16',
  },
}

export function Logo({ 
  className, 
  size = 'md', 
  variant = 'full',
  showTagline = false 
}: LogoProps) {
  const config = sizeConfig[size]

  if (variant === 'icon') {
    return (
      <div className={cn(
        'flex items-center justify-center rounded-lg bg-gradient-to-br from-[#4bc5d4] to-[#1d8fb5]',
        config.container,
        'aspect-square',
        className
      )}>
        <span className={cn(
          'font-bold text-white',
          size === 'sm' ? 'text-sm' : 
          size === 'md' ? 'text-base' :
          size === 'lg' ? 'text-lg' : 'text-xl'
        )}>
          S
        </span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className={cn(
          'flex items-center justify-center rounded-lg bg-gradient-to-br from-[#4bc5d4] to-[#1d8fb5]',
          config.container,
          'aspect-square'
        )}>
          <span className={cn(
            'font-bold text-white',
            size === 'sm' ? 'text-sm' : 
            size === 'md' ? 'text-base' :
            size === 'lg' ? 'text-lg' : 'text-xl'
          )}>
            S
          </span>
        </div>
        <span className={cn(
          'font-bold text-[#24add6] tracking-tight',
          config.text
        )}>
          Solven
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-start', className)}>
      <div className="flex items-center space-x-3">
        <div className={cn(
          'flex items-center justify-center rounded-xl bg-gradient-to-br from-[#4bc5d4] to-[#1d8fb5] shadow-lg',
          config.container,
          'aspect-square'
        )}>
          <span className={cn(
            'font-bold text-white',
            size === 'sm' ? 'text-base' : 
            size === 'md' ? 'text-lg' :
            size === 'lg' ? 'text-xl' : 'text-2xl'
          )}>
            S
          </span>
        </div>
        <div className="flex flex-col">
          <span className={cn(
            'font-bold text-[#24add6] tracking-tight',
            config.text
          )}>
            Solven
          </span>
          {showTagline && (
            <span className={cn(
              'text-muted-foreground font-medium',
              config.tagline
            )}>
              Sistema de Gestión Integral
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente específico para el sidebar
export function SidebarLogo() {
  return (
    <div className="flex items-center space-x-3 px-4 py-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#4bc5d4] to-[#1d8fb5] shadow-sm">
        <span className="text-sm font-bold text-white">S</span>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold text-[#24add6] tracking-tight">
          Solven
        </span>
        <span className="text-xs text-muted-foreground -mt-1">
          Silverlight Colombia
        </span>
      </div>
    </div>
  )
}

// Componente para el header principal
export function HeaderLogo() {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center justify-center w-6 h-6 rounded bg-gradient-to-br from-[#4bc5d4] to-[#1d8fb5]">
        <span className="text-xs font-bold text-white">S</span>
      </div>
      <span className="text-base font-bold text-[#24add6]">
        Solven
      </span>
    </div>
  )
}