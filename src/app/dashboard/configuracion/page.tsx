'use client'

import { SecuritySettings } from '@/components/security/security-settings'
import { UserProfile } from '@/components/security/user-profile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { User, Shield } from 'lucide-react'

export default function ConfiguracionPage() {
  return (
    <div className="container max-w-4xl py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tu perfil personal y configuraciones de seguridad
        </p>
      </div>

      {/* Perfil de Usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Mi Perfil
          </CardTitle>
          <CardDescription>
            Actualiza tu información personal y datos de contacto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserProfile />
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