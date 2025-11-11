'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Smartphone, CheckCircle, AlertTriangle } from 'lucide-react'
import { useSecurityContext } from './security-provider'
import { useAuth } from '@/hooks/use-auth'

export function SecuritySettings() {
  const { user, hasRole } = useAuth()
  const { is2FAEnabled, setup2FA, disable2FA } = useSecurityContext()
  const [isLoading, setIsLoading] = useState(false)

  const isAdmin = hasRole(['administrador'])

  const handleSetup2FA = async () => {
    setIsLoading(true)
    try {
      await setup2FA()
    } catch (error) {
      console.error('Error setting up 2FA:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!confirm('¿Estás seguro de que quieres deshabilitar 2FA? Esto reducirá la seguridad de tu cuenta.')) {
      return
    }

    setIsLoading(true)
    try {
      await disable2FA()
    } catch (error) {
      console.error('Error disabling 2FA:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración de Seguridad</h2>
        <p className="text-muted-foreground">
          Gestiona la configuración de seguridad de tu cuenta
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Autenticación de Dos Factores (2FA)
          </CardTitle>
          <CardDescription>
            Agrega una capa adicional de seguridad a tu cuenta con códigos de verificación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Estado:</span>
                {is2FAEnabled ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Habilitado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Deshabilitado
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {is2FAEnabled 
                  ? 'Tu cuenta está protegida con 2FA'
                  : 'Tu cuenta no tiene 2FA configurado'
                }
              </p>
            </div>
            
            {is2FAEnabled ? (
              <Button
                variant="destructive"
                onClick={handleDisable2FA}
                disabled={isLoading}
              >
                {isLoading ? 'Deshabilitando...' : 'Deshabilitar 2FA'}
              </Button>
            ) : (
              <Button
                onClick={handleSetup2FA}
                disabled={isLoading}
              >
                {isLoading ? 'Configurando...' : 'Configurar 2FA'}
              </Button>
            )}
          </div>

          {!is2FAEnabled && isAdmin && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Recomendación para Administradores:</strong> Como administrador, 
                tu cuenta tiene acceso a información sensible. Configurar 2FA es altamente 
                recomendado para proteger el sistema y los datos de los clientes.
              </AlertDescription>
            </Alert>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">¿Qué necesitas?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Una aplicación de autenticación (Google Authenticator, Authy, etc.)</li>
              <li>• Tu teléfono móvil</li>
              <li>• Unos minutos para la configuración inicial</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Acceso a Módulos Seguros
          </CardTitle>
          <CardDescription>
            Información sobre el acceso a módulos que requieren autenticación adicional
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Módulo de Accesos/Credenciales</div>
                <div className="text-sm text-muted-foreground">
                  Gestión de credenciales y contraseñas empresariales
                </div>
              </div>
              {is2FAEnabled ? (
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Acceso Completo
                </Badge>
              ) : isAdmin ? (
                <Badge variant="secondary">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Acceso Limitado
                </Badge>
              ) : (
                <Badge variant="destructive">
                  Sin Acceso
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}