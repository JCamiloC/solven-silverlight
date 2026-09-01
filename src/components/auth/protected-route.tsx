'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { hasSupabaseAuthCookieHint } from '@/lib/auth/auth-cookie'
import { UserRole } from '@/types'
import { Loading } from '@/components/ui/loading'

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
  const { user, profile, initialized, hasRole } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!initialized || isRedirecting) return

    if (requireAuth && !user) {
      if (hasSupabaseAuthCookieHint()) {
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
  ])

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
