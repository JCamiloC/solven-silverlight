'use client'

import { 
  DashboardStats,
  RecentTickets,
  HardwareOverview,
  UpcomingMaintenances
} from '@/components/dashboard'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
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
    </ProtectedRoute>
  )
}