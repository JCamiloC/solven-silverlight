'use client'

import { ThemeToggle } from './theme-toggle'
import { Label } from '@/components/ui/label'

export function AppearanceSettings() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <Label>Tema de la interfaz</Label>
        <p className="text-sm text-muted-foreground">
          Por defecto la app usa Sistema: sigue el tema claro u oscuro de Windows, macOS o el
          navegador. Puedes fijar Claro u Oscuro manualmente si lo prefieres.
        </p>
      </div>
      <ThemeToggle variant="full" align="end" />
    </div>
  )
}
