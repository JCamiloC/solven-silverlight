'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { UserRole } from '@/types'
import { Loading } from '@/components/ui/loading'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requireAuth?: boolean
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, profile, loading, hasRole, refresh } = useAuth()
  const router = useRouter()
  const [retryCount, setRetryCount] = useState(0)
  const [showError, setShowError] = useState(false)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-retry: si después de 8 segundos sigue cargando, intentar refrescar
  useEffect(() => {
    if (!loading) {
      setShowError(false)
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      return
    }

    retryTimeoutRef.current = setTimeout(() => {
      if (loading && retryCount < 2) {
        console.log(`[ProtectedRoute] Auth timeout, auto-retry ${retryCount + 1}/2`)
        setRetryCount(prev => prev + 1)
        refresh()
      } else if (loading && retryCount >= 2) {
        console.error('[ProtectedRoute] Max retries reached, showing error')
        setShowError(true)
      }
    }, 8000) // 8 segundos

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [loading, retryCount, refresh])

  useEffect(() => {
    if (loading) return

    // Check if authentication is required and user is not logged in
    if (requireAuth && !user) {
      router.push('/auth/login')
      return
    }

    // Check if specific roles are required
    if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
      // Redirect based on user role
      if (profile?.role === 'cliente') {
        router.push('/dashboard/tickets') // Clients can only access tickets
      } else {
        router.push('/dashboard') // Others go to main dashboard
      }
      return
    }
  }, [user, profile, loading, hasRole, allowedRoles, requireAuth, router])

  // Si hay error después de reintentos, mostrar opciones
  if (showError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No se pudo verificar la autenticación después de varios intentos.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setShowError(false)
                setRetryCount(0)
                refresh()
              }} 
              className="flex-1"
            >
              Reintentar
            </Button>
            <Button 
              onClick={() => router.push('/auth/login')} 
              variant="outline"
              className="flex-1"
            >
              Ir a Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading 
          size="lg" 
          text={retryCount > 0 ? `Reintentando (${retryCount}/2)...` : "Verificando autenticación..."} 
        />
      </div>
    )
  }

  // Show nothing while redirecting
  if (requireAuth && !user) {
    return null
  }

  // Check role permissions
  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return null
  }

  return <>{children}</>
}