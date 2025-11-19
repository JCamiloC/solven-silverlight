'use client'

import { Shield, Lock, Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export function TwoFactorRequiredNotice() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <Lock className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-orange-900">
                Acceso Restringido
              </CardTitle>
              <CardDescription className="text-base mt-2 text-orange-700">
                Se requiere autenticación de dos factores (2FA)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-orange-300 bg-orange-100/50">
              <Shield className="h-4 w-4 text-orange-700" />
              <AlertDescription className="text-orange-900">
                <strong>Módulo de Alta Seguridad:</strong> El acceso al módulo de Control de Accesos 
                requiere que tengas configurada la autenticación de dos factores (2FA) para garantizar 
                la seguridad de las credenciales almacenadas.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Para acceder a este módulo necesitas:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Configurar la autenticación de dos factores (2FA) en tu cuenta</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Utilizar una aplicación autenticadora como Google Authenticator o Microsoft Authenticator</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Verificar tu identidad cada vez que accedas a credenciales sensibles</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Button asChild className="w-full" size="lg">
                <Link href="/dashboard/configuracion">
                  <Settings className="mr-2 h-4 w-4" />
                  Ir a Configuración para habilitar 2FA
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard">
                  Volver al Dashboard
                </Link>
              </Button>
            </div>

            <div className="pt-4 border-t text-xs text-center text-muted-foreground">
              <p>
                Esta medida de seguridad es parte de nuestro cumplimiento con ISO 27001 
                para proteger información sensible.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}