'use client'

import { 
  DashboardStats,
  RecentTickets,
  HardwareOverview,
  QuickActions
} from '@/components/dashboard'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen general del sistema de mesa de ayuda
          </p>
        </div>

        <DashboardStats />

        <div className="grid gap-6 lg:grid-cols-2">
          <RecentTickets />
          <HardwareOverview />
        </div>

        <QuickActions />
      </div>
    </ProtectedRoute>
  )
}