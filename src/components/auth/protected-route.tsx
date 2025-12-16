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
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (loading) return

    // Marcar que ya verificamos
    if (!hasChecked) {
      setHasChecked(true)
    }

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
  }, [user, profile, loading, hasRole, allowedRoles, requireAuth, router, hasChecked])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" text="Verificando autenticación..." />
      </div>
    )
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
