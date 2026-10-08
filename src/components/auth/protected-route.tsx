'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { hasSupabaseAuthCookieHint } from '@/lib/auth/auth-cookie'
import { UserRole } from '@/types'
import { Loading } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import {
  resolveEffectiveProfile,
  userHasAllowedRole,
} from '@/lib/auth/fallback-profile'

const SESSION_SYNC_TIMEOUT_MS = 8_000

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
  const { user, profile, initialized, refresh, signOut } = useAuth()
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

    const effectiveProfile = resolveEffectiveProfile(user, profile)
    if (
      allowedRoles.length > 0 &&
      user &&
      effectiveProfile &&
      !userHasAllowedRole(user, profile, allowedRoles)
    ) {
      setIsRedirecting(true)
      if (effectiveProfile.role === 'cliente') {
        router.replace('/dashboard')
      } else {
        router.replace('/dashboard')
      }
    }
  }, [
    user,
    profile,
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

  const handleForceLogout = useCallback(async () => {
    try {
      await signOut()
    } catch {
      window.location.assign('/auth/login?logout=1')
    }
  }, [signOut])

  if (!initialized) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Loading size="lg" text="Conectando sesión..." />
      </div>
    )
  }

  if (user) {
    if (
      allowedRoles.length > 0 &&
      !userHasAllowedRole(user, profile, allowedRoles)
    ) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loading size="lg" text="Redirigiendo..." />
        </div>
      )
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
              <Button type="button" variant="destructive" onClick={() => void handleForceLogout()}>
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
        <Loading size="lg" text="Restaurando sesión..." />
        <Button type="button" variant="link" onClick={() => void handleForceLogout()}>
          Cerrar sesión
        </Button>
      </div>
    )
  }

  if (isRedirecting || requireAuth) {
    return null
  }

  return <>{children}</>
}
