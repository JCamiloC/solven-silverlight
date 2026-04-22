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

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, profile, loading, hasRole } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [loadingGuardTriggered, setLoadingGuardTriggered] = useState(false)

  useEffect(() => {
    if (!loading) {
      setLoadingGuardTriggered(false)
      return
    }

    const timeout = setTimeout(() => {
      setLoadingGuardTriggered(true)
    }, 3500)

    return () => clearTimeout(timeout)
  }, [loading])

  const isCheckingAuth = loading && !loadingGuardTriggered

  useEffect(() => {
    if (isCheckingAuth || isRedirecting) return

    // Check if authentication is required and user is not logged in
    if (requireAuth && !user) {
      setIsRedirecting(true)
      router.push('/auth/login')
      return
    }

    // Check if specific roles are required
    if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
      setIsRedirecting(true)
      // Redirect based on user role
      if (profile?.role === 'cliente') {
        // Clientes van a su página de empresa si tienen client_id asignado
        if (profile.client_id) {
          router.push(`/dashboard/clientes/${profile.client_id}`)
        } else {
          // Si no tiene client_id, ir a tickets por seguridad
          router.push('/dashboard/tickets')
        }
      } else {
        router.push('/dashboard') // Staff va al dashboard principal
      }
      return
    }
  }, [user, profile, hasRole, allowedRoles, requireAuth, router, isRedirecting, isCheckingAuth])

  // Show loading while checking authentication
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

  // Show nothing while redirecting (user/profile requirements not met)
  if (requireAuth && !user) {
    return null
  }

  // Check role permissions
  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return null
  }

  return <>{children}</>
}
