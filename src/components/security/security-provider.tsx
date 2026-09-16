import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/use-auth'
import { TwoFactorService } from '@/lib/two-factor'
import { getTwoFactorValidityMinutes } from '@/lib/session-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Smartphone, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface SecurityContextType {
  is2FAEnabled: boolean
  isVerified: boolean
  is2FAStatusLoading: boolean
  requireVerification: () => Promise<boolean>
  setup2FA: () => Promise<void>
  disable2FA: () => Promise<void>
  refresh2FAStatus: () => Promise<void>
}

const SecurityContext = createContext<SecurityContextType | null>(null)

export function useSecurityContext() {
  const context = useContext(SecurityContext)
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider')
  }
  return context
}

interface SecurityProviderProps {
  children: ReactNode
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const { user, profile, refresh: refreshAuthProfile } = useAuth()
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [is2FAStatusLoading, setIs2FAStatusLoading] = useState(true)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [setupData, setSetupData] = useState<{ qrCodeUrl: string; secret: string } | null>(null)
  const [verificationResolver, setVerificationResolver] = useState<((value: boolean) => void) | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const checkTwoFactorStatus = useCallback(async () => {
    if (!user?.id) {
      setIs2FAEnabled(false)
      setIsVerified(false)
      setIs2FAStatusLoading(false)
      return
    }

    setIs2FAStatusLoading(true)

    try {
      const enabled = await TwoFactorService.is2FAEnabled(user.id)
      setIs2FAEnabled(enabled)

      if (enabled) {
        const validityMinutes = getTwoFactorValidityMinutes(profile?.role)
        const recentlyVerified = await TwoFactorService.isRecentlyVerified(
          user.id,
          validityMinutes
        )
        setIsVerified(recentlyVerified)
      } else {
        setIsVerified(false)
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error)
      setIs2FAEnabled(profile?.totp_enabled === true)
      setIsVerified(false)
    } finally {
      setIs2FAStatusLoading(false)
    }
  }, [user?.id, profile?.role, profile?.totp_enabled])

  // Check 2FA status on mount
  useEffect(() => {
    if (user?.id) {
      checkTwoFactorStatus()
    }
  }, [user?.id, checkTwoFactorStatus])

  const requireVerification = async (): Promise<boolean> => {
    if (!user?.id) return false

    // Check if user has 2FA enabled
    const enabled = await TwoFactorService.is2FAEnabled(user.id)
    setIs2FAEnabled(enabled)
    if (!enabled) {
      // If user is admin and doesn't have 2FA, allow them to set it up
      const userRole = profile?.role
      const isAdmin = userRole === 'administrador'
      
      if (isAdmin) {
        toast.info('Recomendamos configurar 2FA para mayor seguridad')
        return true
      }

      if (userRole === 'cliente' || userRole === 'lider_soporte') {
        toast.error('Debes configurar 2FA en Configuración para acceder a credenciales.')
        return false
      }

      toast.error('2FA no está configurado. Contacta al administrador.')
      return false
    }

    // Check if recently verified (staff interno: 24h; cliente: 8h)
    const validityMinutes = getTwoFactorValidityMinutes(profile?.role)
    const recentlyVerified = await TwoFactorService.isRecentlyVerified(
      user.id,
      validityMinutes
    )
    if (recentlyVerified) {
      setIsVerified(true)
      return true
    }

    // Show verification dialog
    return new Promise((resolve) => {
      setVerificationResolver(() => resolve)
      setShowVerificationDialog(true)
    })
  }

  const handleVerification = async () => {
    if (!user?.id || !verificationCode.trim()) {
      setError('Por favor ingresa el código de verificación')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await TwoFactorService.verifyTOTP(user.id, verificationCode.trim())
      
      if (result.isValid) {
        setIs2FAEnabled(true)
        setIsVerified(true)
        setShowVerificationDialog(false)
        setVerificationCode('')
        toast.success('Verificación exitosa')

        await refreshAuthProfile()
        
        if (verificationResolver) {
          verificationResolver(true)
          setVerificationResolver(null)
        }
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError('Error al verificar el código')
    } finally {
      setIsLoading(false)
    }
  }

  const setup2FA = async () => {
    if (!user?.id || !user?.email) return

    setIsLoading(true)
    setError('')

    try {
      const setup = await TwoFactorService.setupTOTP(user.id, user.email)
      setSetupData({
        qrCodeUrl: setup.qrCodeUrl,
        secret: setup.manualEntryKey
      })
      setShowSetupDialog(true)
    } catch (error) {
      toast.error('Error al configurar 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupVerification = async () => {
    if (!user?.id || !verificationCode.trim()) {
      setError('Por favor ingresa el código de verificación')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await TwoFactorService.verifyAndEnableTOTP(user.id, verificationCode.trim())
      
      if (result.isValid) {
        setIs2FAEnabled(true)
        setIsVerified(true)
        setShowSetupDialog(false)
        setVerificationCode('')
        setSetupData(null)
        toast.success('2FA configurado exitosamente')
        await refreshAuthProfile()
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError('Error al verificar el código')
    } finally {
      setIsLoading(false)
    }
  }

  const disable2FA = async () => {
    if (!user?.id) return

    setIsLoading(true)
    
    try {
      const success = await TwoFactorService.disableTOTP(user.id)
      
      if (success) {
        setIs2FAEnabled(false)
        setIsVerified(false)
        toast.success('2FA deshabilitado')
        await refreshAuthProfile()
      } else {
        toast.error('Error al deshabilitar 2FA')
      }
    } catch (error) {
      toast.error('Error al deshabilitar 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const contextValue: SecurityContextType = {
    is2FAEnabled,
    isVerified,
    is2FAStatusLoading,
    requireVerification,
    setup2FA,
    disable2FA,
    refresh2FAStatus: checkTwoFactorStatus,
  }

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={(open) => {
        if (!open && verificationResolver) {
          verificationResolver(false)
          setVerificationResolver(null)
        }
        setShowVerificationDialog(open)
        setVerificationCode('')
        setError('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verificación de Seguridad
            </DialogTitle>
            <DialogDescription>
              Ingresa el código de tu aplicación de autenticación para continuar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Código de 6 dígitos</label>
              <Input
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setError('')
                }}
                maxLength={6}
                className="text-center text-lg font-mono"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVerificationDialog(false)
                  if (verificationResolver) {
                    verificationResolver(false)
                    setVerificationResolver(null)
                  }
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleVerification}
                disabled={isLoading || verificationCode.length !== 6}
              >
                {isLoading ? 'Verificando...' : 'Verificar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={(open) => {
        setShowSetupDialog(open)
        if (!open) {
          setVerificationCode('')
          setError('')
          setSetupData(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Configurar Autenticación 2FA
            </DialogTitle>
            <DialogDescription>
              Escanea el código QR con tu aplicación de autenticación
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {setupData && (
              <>
                <div className="flex justify-center">
                  <Image 
                    src={setupData.qrCodeUrl} 
                    alt="QR Code" 
                    width={256}
                    height={256}
                    className="border rounded-lg"
                  />
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    O ingresa manualmente:
                  </p>
                  <code className="text-xs bg-muted p-2 rounded break-all">
                    {setupData.secret}
                  </code>
                </div>
              </>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Código de verificación
              </label>
              <Input
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setError('')
                }}
                maxLength={6}
                className="text-center text-lg font-mono"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSetupDialog(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSetupVerification}
                disabled={isLoading || verificationCode.length !== 6}
              >
                {isLoading ? 'Verificando...' : 'Configurar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SecurityContext.Provider>
  )
}

// Higher-order component for protecting routes that require 2FA
interface SecureRouteProps {
  children: ReactNode
  requireAdmin?: boolean
}

export function SecureRoute({ children, requireAdmin = false }: SecureRouteProps) {
  const { profile, hasRole } = useAuth()
  const { is2FAEnabled, isVerified, is2FAStatusLoading, requireVerification, setup2FA } =
    useSecurityContext()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [showSetupPrompt, setShowSetupPrompt] = useState(false)

  const checkAuthorization = useCallback(async () => {
    setIsChecking(true)

    // Check role authorization
    if (requireAdmin && !hasRole(['administrador'])) {
      setIsAuthorized(false)
      setIsChecking(false)
      return
    }

    // Check 2FA requirement
    if (!is2FAEnabled) {
      // If user is admin and doesn't have 2FA, show setup prompt
      if (hasRole(['administrador'])) {
        setShowSetupPrompt(true)
        setIsAuthorized(true) // Allow access but show setup prompt
      } else {
        setIsAuthorized(false)
      }
      setIsChecking(false)
      return
    }

    // Si ya está verificado, no pedir verificación de nuevo
    if (isVerified) {
      setIsAuthorized(true)
      setIsChecking(false)
      return
    }

    // Require 2FA verification solo si no está verificado
    const verified = await requireVerification()
    setIsAuthorized(verified)
    setIsChecking(false)
  }, [requireAdmin, hasRole, is2FAEnabled, isVerified, requireVerification])

  useEffect(() => {
    if (!profile?.id || is2FAStatusLoading) return
    void checkAuthorization()
  }, [profile?.id, is2FAEnabled, isVerified, is2FAStatusLoading, checkAuthorization])

  if (isChecking || is2FAStatusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Shield className="h-8 w-8 animate-pulse mx-auto" />
          <p>Verificando autorizaciones...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    const needsVerificationOnly = is2FAEnabled && !isVerified

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md px-4">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">
            {needsVerificationOnly ? 'Verificación 2FA requerida' : 'Acceso Restringido'}
          </h2>
          <p className="text-muted-foreground">
            {needsVerificationOnly
              ? 'Tu 2FA está configurado. Ingresa el código de tu autenticador para acceder a las credenciales.'
              : 'Este módulo requiere autenticación de dos factores (2FA) habilitada. Configúrala en Configuración.'}
          </p>
          {needsVerificationOnly ? (
            <Button onClick={() => void checkAuthorization()}>Verificar con código 2FA</Button>
          ) : (
            <Button asChild>
              <Link href="/dashboard/configuracion">Ir a Configuración</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Show setup prompt for admins without 2FA
  if (showSetupPrompt && !is2FAEnabled) {
    return (
      <div className="space-y-6">
        <Alert className="border-yellow-200 bg-yellow-50">
          <Shield className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>Recomendación de Seguridad:</strong> Este módulo contiene información sensible. 
              Configura 2FA para mayor protección.
            </span>
            <Button
              size="sm"
              onClick={setup2FA}
              className="ml-4"
            >
              Configurar 2FA
            </Button>
          </AlertDescription>
        </Alert>
        {children}
      </div>
    )
  }

  return <>{children}</>
}