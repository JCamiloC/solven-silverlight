'use client'

import {
  DashboardStats,
  RecentTickets,
  HardwareOverview,
  UpcomingMaintenances,
  ClientDashboard,
} from '@/components/dashboard'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/hooks/use-auth'
import { resolveEffectiveProfile } from '@/lib/auth/fallback-profile'
import { Loading } from '@/components/ui/loading'

function StaffDashboard() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general del sistema de mesa de ayuda
        </p>
      </div>

      <DashboardStats />

      <UpcomingMaintenances />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <RecentTickets />
        <HardwareOverview />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, profile, initialized, loading } = useAuth()
  const effectiveProfile = resolveEffectiveProfile(user, profile)
  const isClientUser = effectiveProfile?.role === 'cliente'

  return (
    <ProtectedRoute
      allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}
    >
      {!initialized ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loading size="lg" text="Cargando panel..." />
        </div>
      ) : loading && !profile ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loading size="lg" text="Sincronizando perfil..." />
        </div>
      ) : isClientUser ? (
        <ClientDashboard />
      ) : (
        <StaffDashboard />
      )}
    </ProtectedRoute>
  )
}
