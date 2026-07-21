'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { UserRole } from '@/types'
import { Loading } from '@/components/ui/loading'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requireAuth?: boolean
}

function hasAuthCookieHint(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((entry) => {
    const name = entry.trim().split('=')[0] || ''
    return name.startsWith('sb-') && name.includes('auth-token')
  })
}

export function ProtectedRoute({
  children,
  allowedRoles = [],
  requireAuth = true,
}: ProtectedRouteProps) {
  const { user, profile, loading, hasRole } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [loadingGuardTriggered, setLoadingGuardTriggered] = useState(false)
  const [authGraceExpired, setAuthGraceExpired] = useState(false)

  // Esperar más tiempo antes de considerar "sin sesión" (evita bounce post-login)
  useEffect(() => {
    if (!loading) {
      setLoadingGuardTriggered(false)
      return
    }

    const timeout = setTimeout(() => {
      setLoadingGuardTriggered(true)
    }, 10000)

    return () => clearTimeout(timeout)
  }, [loading])

  // Gracia adicional si hay cookie pero user aún no hidratado
  useEffect(() => {
    if (user || !requireAuth) {
      setAuthGraceExpired(false)
      return
    }

    if (!hasAuthCookieHint()) {
      setAuthGraceExpired(true)
      return
    }

    setAuthGraceExpired(false)
    const timeout = setTimeout(() => {
      setAuthGraceExpired(true)
    }, 8000)

    return () => clearTimeout(timeout)
  }, [user, requireAuth])

  const isCheckingAuth = (loading && !loadingGuardTriggered) || (!user && !authGraceExpired && hasAuthCookieHint())

  useEffect(() => {
    if (isCheckingAuth || isRedirecting) return

    if (requireAuth && !user) {
      // Última salvaguarda: si aún hay cookie, no redirigir (middleware/cliente aún sincronizando)
      if (hasAuthCookieHint() && !authGraceExpired) {
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
    isCheckingAuth,
    authGraceExpired,
  ])

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" text="Verificando autenticación..." />
      </div>
    )
  }

  if (isRedirecting) {
    return null
  }

  if (requireAuth && !user) {
    return null
  }

  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return null
  }

  return <>{children}</>
}
