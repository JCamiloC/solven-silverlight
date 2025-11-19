'use client'

import { useState, useEffect } from 'react'
import { Palette, Check, Settings2, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTheme, brandThemes, BrandTheme } from '@/lib/theme-manager'
import { toast } from 'sonner'

interface ThemeSelectorProps {
  showAsButton?: boolean
  variant?: 'dialog' | 'inline'
}

interface ThemeGridProps {
  availableThemes: BrandTheme[]
  currentThemeId: string
  onThemeChange: (themeId: string) => void
}

const ThemeGrid = ({ availableThemes, currentThemeId, onThemeChange }: ThemeGridProps) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {availableThemes.map((theme) => (
      <ThemeCard
        key={theme.id}
        theme={theme}
        isSelected={theme.id === currentThemeId}
        onSelect={() => onThemeChange(theme.id)}
      />
    ))}
  </div>
)

export function ThemeSelector({ showAsButton = true, variant = 'dialog' }: ThemeSelectorProps) {
  const { currentTheme, currentThemeId, availableThemes, changeTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevenir hidratación mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true)
    }
  }, [])

  const handleThemeChange = (themeId: string) => {
    changeTheme(themeId)
    toast.success(`Tema "${brandThemes[themeId].name}" aplicado correctamente`)
    if (variant === 'dialog') {
      setIsOpen(false)
    }
  }

  const exportThemeConfig = () => {
    const config = {
      theme: currentThemeId,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mesa-ayuda-theme-${currentThemeId}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Configuración de tema exportada')
  }

  // No renderizar hasta que esté montado en el cliente
  if (!mounted) {
    return showAsButton ? (
      <Button variant="outline" size="sm" disabled>
        <Palette className="h-4 w-4 mr-2" />
        Tema
      </Button>
    ) : null
  }

  if (variant === 'inline') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Tema Corporativo</h3>
            <p className="text-sm text-muted-foreground">
              Personaliza la apariencia según tu organización
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportThemeConfig}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
        
        <ThemeGrid 
          availableThemes={availableThemes}
          currentThemeId={currentThemeId}
          onThemeChange={handleThemeChange}
        />
        
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Tema Actual</h4>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div 
                className="w-4 h-4 rounded-full border" 
                style={{ backgroundColor: currentTheme.colors.primary }}
              />
              <div 
                className="w-4 h-4 rounded-full border" 
                style={{ backgroundColor: currentTheme.colors.secondary }}
              />
              <div 
                className="w-4 h-4 rounded-full border" 
                style={{ backgroundColor: currentTheme.colors.accent }}
              />
            </div>
            <div>
              <p className="font-medium">{currentTheme.name}</p>
              <p className="text-sm text-muted-foreground">{currentTheme.description}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {showAsButton ? (
          <Button variant="outline" size="sm">
            <Palette className="h-4 w-4 mr-2" />
            Tema
          </Button>
        ) : (
          <div className="cursor-pointer">
            <Settings2 className="h-4 w-4" />
          </div>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Configuración de Tema Corporativo
          </DialogTitle>
          <DialogDescription>
            Personaliza la apariencia de la aplicación según tu organización o licitación.
            Los cambios se aplicarán inmediatamente y se guardarán automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tema Actual */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div 
                  className="w-4 h-4 rounded-full border" 
                  style={{ backgroundColor: currentTheme.colors.primary }}
                />
                <div 
                  className="w-4 h-4 rounded-full border" 
                  style={{ backgroundColor: currentTheme.colors.secondary }}
                />
                <div 
                  className="w-4 h-4 rounded-full border" 
                  style={{ backgroundColor: currentTheme.colors.accent }}
                />
              </div>
              <div>
                <p className="font-medium">Tema Actual: {currentTheme.name}</p>
                <p className="text-sm text-muted-foreground">{currentTheme.description}</p>
              </div>
            </div>
            
            <Button variant="outline" size="sm" onClick={exportThemeConfig}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          <Separator />

          {/* Grid de Temas */}
          <div>
            <h4 className="font-medium mb-4">Temas Disponibles</h4>
            <ThemeGrid 
              availableThemes={availableThemes}
              currentThemeId={currentThemeId}
              onThemeChange={handleThemeChange}
            />
          </div>

          {/* Información adicional */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Para Licitaciones
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Los temas están diseñados específicamente para cumplir con los requisitos 
              visuales de diferentes sectores. Cada tema incluye paletas de colores 
              apropiadas y puede ser personalizado según las necesidades del cliente.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ThemeCardProps {
  theme: BrandTheme
  isSelected: boolean
  onSelect: () => void
}

function ThemeCard({ theme, isSelected, onSelect }: ThemeCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{theme.name}</CardTitle>
          {isSelected && (
            <Badge variant="default" className="h-5">
              <Check className="h-3 w-3 mr-1" />
              Activo
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">{theme.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Paleta de colores */}
        <div>
          <p className="text-xs font-medium mb-2">Colores</p>
          <div className="flex gap-1">
            <div 
              className="w-6 h-6 rounded border shadow-sm" 
              style={{ backgroundColor: theme.colors.primary }}
              title="Principal"
            />
            <div 
              className="w-6 h-6 rounded border shadow-sm" 
              style={{ backgroundColor: theme.colors.secondary }}
              title="Secundario"
            />
            <div 
              className="w-6 h-6 rounded border shadow-sm" 
              style={{ backgroundColor: theme.colors.accent }}
              title="Acento"
            />
            <div 
              className="w-6 h-6 rounded border shadow-sm" 
              style={{ backgroundColor: theme.colors.success }}
              title="Éxito"
            />
            <div 
              className="w-6 h-6 rounded border shadow-sm" 
              style={{ backgroundColor: theme.colors.error }}
              title="Error"
            />
          </div>
        </div>
        
        {/* Fuente principal */}
        <div>
          <p className="text-xs font-medium mb-1">Fuente</p>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: theme.fonts.primary }}>
            {theme.fonts.primary}
          </p>
        </div>
        
        {/* Características especiales */}
        {(theme.spacing?.scale !== 1 || theme.borderRadius?.scale !== 1) && (
          <div className="flex gap-1">
            {theme.spacing?.scale !== 1 && (
              <Badge variant="outline" className="text-xs">
                Espaciado {theme.spacing?.scale}x
              </Badge>
            )}
            {theme.borderRadius?.scale !== 1 && (
              <Badge variant="outline" className="text-xs">
                Bordes {theme.borderRadius?.scale}x
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}