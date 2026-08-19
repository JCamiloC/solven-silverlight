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
  const [waitExpired, setWaitExpired] = useState(false)

  const waitingForHydration = Boolean(
    requireAuth && !user && !waitExpired && (loading || hasAuthCookieHint())
  )

  useEffect(() => {
    if (user || !requireAuth) {
      setWaitExpired(false)
      return
    }

    const timeout = setTimeout(() => {
      setWaitExpired(true)
    }, 8000)

    return () => clearTimeout(timeout)
  }, [user, requireAuth])

  useEffect(() => {
    if (waitingForHydration || isRedirecting) return

    if (requireAuth && !user) {
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
    waitingForHydration,
  ])

  if (user) {
    if (allowedRoles.length > 0 && profile && !hasRole(allowedRoles)) {
      return null
    }
    return <>{children}</>
  }

  if (waitingForHydration) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" text="Verificando autenticación..." />
      </div>
    )
  }

  if (isRedirecting || (requireAuth && !user)) {
    return null
  }

  return <>{children}</>
}
