'use client'

import { SecuritySettings } from '@/components/security/security-settings'
import { ThemeSelector } from '@/components/ui/theme-selector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Palette, Shield } from 'lucide-react'

export default function ConfiguracionPage() {
  return (
    <div className="container max-w-4xl py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona la seguridad, apariencia y configuraciones generales del sistema
        </p>
      </div>

      {/* Configuración de Tema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Configuración Visual
          </CardTitle>
          <CardDescription>
            Personaliza la apariencia de la aplicación según tu organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector variant="inline" />
        </CardContent>
      </Card>

      <Separator />

      {/* Configuración de Seguridad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configuración de Seguridad
          </CardTitle>
          <CardDescription>
            Gestiona la autenticación de dos factores y políticas de seguridad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SecuritySettings />
        </CardContent>
      </Card>
    </div>
  )
}