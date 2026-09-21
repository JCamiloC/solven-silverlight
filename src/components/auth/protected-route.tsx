'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { hasSupabaseAuthCookieHint } from '@/lib/auth/auth-cookie'
import { UserRole } from '@/types'
import { Loading } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'

const SESSION_SYNC_TIMEOUT_MS = 12_000

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requireAuth?: boolean
}

export function ProtectedRoute({
  children,
  allowedRoles = [],
  requireAuth = true,
}: ProtectedRouteProps) {
  const { user, profile, initialized, hasRole, refresh } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [syncStalled, setSyncStalled] = useState(false)
  const [syncAttempted, setSyncAttempted] = useState(false)

  const trySyncSession = useCallback(async () => {
    setSyncStalled(false)
    setSyncAttempted(true)
    await refresh()
  }, [refresh])

  useEffect(() => {
    if (!initialized || isRedirecting) return

    if (requireAuth && !user) {
      if (hasSupabaseAuthCookieHint()) {
        if (!syncAttempted) {
          void trySyncSession()
        }
        return
      }
      setIsRedirecting(true)
      router.replace('/auth/login')
      return
    }

    if (allowedRoles.length > 0 && user && profile && !hasRole(allowedRoles)) {
      setIsRedirecting(true)
      if (profile.role === 'cliente') {
        if (profile.client_id) {
          router.replace(`/dashboard/clientes/${profile.client_id}`)
        } else {
          router.replace('/dashboard/tickets')
        }
      } else {
        router.replace('/dashboard')
      }
    }
  }, [
    user,
    profile,
    hasRole,
    allowedRoles,
    requireAuth,
    router,
    isRedirecting,
    initialized,
    syncAttempted,
    trySyncSession,
  ])

  useEffect(() => {
    if (!initialized || user || !hasSupabaseAuthCookieHint()) {
      setSyncStalled(false)
      return
    }

    const timer = setTimeout(() => setSyncStalled(true), SESSION_SYNC_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [initialized, user, syncAttempted])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" text="Verificando autenticación..." />
      </div>
    )
  }

  if (user) {
    if (allowedRoles.length > 0 && profile && !hasRole(allowedRoles)) {
      return null
    }
    return <>{children}</>
  }

  if (requireAuth && hasSupabaseAuthCookieHint()) {
    if (syncStalled) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md space-y-4 text-center">
            <p className="text-muted-foreground">
              No pudimos restaurar tu sesión. Puede deberse a un token vencido mientras trabajabas
              en un formulario.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button type="button" onClick={() => void trySyncSession()}>
                Reintentar sesión
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.replace('/auth/login?reason=expired')}
              >
                Ir a iniciar sesión
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" text="Verificando autenticación..." />
      </div>
    )
  }

  if (isRedirecting || requireAuth) {
    return null
  }

  return <>{children}</>
}
