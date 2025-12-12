'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCustomApplicationsStats } from '@/hooks/use-custom-applications'
import { 
  Package, 
  AlertCircle, 
  Globe, 
  Server, 
  TrendingUp,
  Loader2
} from 'lucide-react'

interface CustomAppStatsProps {
  clientId?: string
}

export function CustomAppStats({ clientId }: CustomAppStatsProps) {
  const { data: stats, isLoading } = useCustomApplicationsStats(clientId)

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cargando...</CardTitle>
            </CardHeader>
            <CardContent>
              <Loader2 className="h-4 w-4 animate-spin" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const statsCards = [
    {
      title: 'Total Aplicaciones',
      value: stats.total,
      icon: Package,
      description: 'Aplicaciones registradas',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Aplicaciones Activas',
      value: stats.active,
      icon: TrendingUp,
      description: 'En producción',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Dominios por Vencer',
      value: stats.expiringDomains,
      icon: Globe,
      description: 'Próximos 30 días',
      color: stats.expiringDomains > 0 ? 'text-orange-600' : 'text-gray-600',
      bgColor: stats.expiringDomains > 0 ? 'bg-orange-100' : 'bg-gray-100',
      badge: stats.expiringDomains > 0,
    },
    {
      title: 'Hosting por Renovar',
      value: stats.expiringHosting,
      icon: Server,
      description: 'Próximos 30 días',
      color: stats.expiringHosting > 0 ? 'text-red-600' : 'text-gray-600',
      bgColor: stats.expiringHosting > 0 ? 'bg-red-100' : 'bg-gray-100',
      badge: stats.expiringHosting > 0,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.badge && stat.value > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Urgente
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
