'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHardwareStatsByClient } from '@/hooks/use-hardware'
import { Computer, Wrench, Archive, TrendingUp } from 'lucide-react'

export function HardwareStats({ clientId }: { clientId: string }) {
  const { data: stats, isLoading } = useHardwareStatsByClient(clientId)

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
              </CardTitle>
              <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-7 bg-muted animate-pulse rounded mb-1"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Equipos',
      value: stats?.total || 0,
      description: 'Equipos registrados',
      icon: Computer,
      color: 'text-blue-600',
    },
    {
      title: 'Equipos Activos',
      value: stats?.active || 0,
      description: 'En funcionamiento',
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      title: 'En Mantenimiento',
      value: stats?.maintenance || 0,
      description: 'Requieren atención',
      icon: Wrench,
      color: 'text-yellow-600',
    },
    {
      title: 'Retirados',
      value: stats?.retired || 0,
      description: 'Fuera de servicio',
      icon: Archive,
      color: 'text-red-600',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}