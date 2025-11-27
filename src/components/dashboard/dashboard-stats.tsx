'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHardwareStats } from '@/hooks/use-hardware'
import { useTicketStats } from '@/hooks/use-tickets'
import { useSoftwareStats } from '@/hooks/use-software'
import { useAccessStats } from '@/hooks/use-access-credentials'
import { useAuth } from '@/hooks/use-auth'
import { 
  HardDrive, 
  Monitor, 
  Key, 
  Ticket
} from 'lucide-react'

export function DashboardStats() {
  const { data: hardwareStats, isLoading: hardwareLoading } = useHardwareStats()
  const { data: ticketStats, isLoading: ticketLoading } = useTicketStats()
  const { data: softwareStats, isLoading: softwareLoading } = useSoftwareStats()
  const { hasRole } = useAuth()
  // Access stats - only for admins
  const isAdmin = hasRole(['administrador'])
  const { data: accessStats, isLoading: accessLoading } = useAccessStats()

  const stats = [
    {
      title: 'Hardware Activo',
      value: hardwareStats?.active || 0,
      total: hardwareStats?.total || 0,
      description: 'Equipos en funcionamiento',
      icon: HardDrive,
      isLoading: hardwareLoading,
    },
    {
      title: 'Licencias Software',
      value: softwareStats?.active || 0,
      total: softwareStats?.total || 0,
      description: 'Licencias vigentes',
      icon: Monitor,
      isLoading: softwareLoading,
    },
    {
      title: 'Accesos Gestionados',
      value: isAdmin ? (accessStats?.active || 0) : '***',
      description: isAdmin ? 'Credenciales activas' : 'Solo administradores',
      icon: Key,
      isLoading: isAdmin ? accessLoading : false,
    },
    {
      title: 'Tickets Abiertos',
      value: ticketStats?.open || 0,
      description: 'Pendientes de resolver',
      icon: Ticket,
      isLoading: ticketLoading,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stat.isLoading ? (
                <div className="space-y-2">
                  <div className="h-7 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                  {stat.total && (
                    <p className="text-xs text-muted-foreground">
                      de {stat.total} total
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}