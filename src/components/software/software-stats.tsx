'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Key, Calendar, AlertCircle, TrendingUp, Loader2, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSoftwareStats, useSoftwareByClient } from '@/hooks/use-software'
import { useEffect, useState } from 'react'

interface SoftwareLicenseStatsProps {
  clientId?: string
}

export function SoftwareLicenseStats({ clientId }: SoftwareLicenseStatsProps) {
  const { data: globalStats, isLoading: loadingGlobal } = useSoftwareStats()
  const { data: clientLicenses, isLoading: loadingClient } = useSoftwareByClient(clientId || '')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    totalCost: 0,
  })

  useEffect(() => {
    if (clientId && clientLicenses) {
      // Calculate stats from client licenses
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      setStats({
        total: clientLicenses.length,
        active: clientLicenses.filter(l => l.status === 'active').length,
        expired: clientLicenses.filter(l => l.status === 'expired').length,
        expiringSoon: clientLicenses.filter(l => {
          if (!l.expiry_date || l.status !== 'active') return false
          const expiryDate = new Date(l.expiry_date)
          return expiryDate <= thirtyDaysFromNow && expiryDate > now
        }).length,
        totalCost: clientLicenses.reduce((sum, l) => sum + Number(l.cost), 0),
      })
    } else if (globalStats) {
      setStats({
        total: globalStats.total,
        active: globalStats.active,
        expired: globalStats.expired,
        expiringSoon: globalStats.expiringSoon,
        totalCost: globalStats.totalCost,
      })
    }
  }, [clientId, clientLicenses, globalStats])

  const isLoading = clientId ? loadingClient : loadingGlobal

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

  const statsCards = [
    {
      title: 'Total Licencias',
      value: stats.total,
      icon: Key,
      description: 'Licencias registradas',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Licencias Activas',
      value: stats.active,
      icon: TrendingUp,
      description: 'En uso',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Por Vencer',
      value: stats.expiringSoon,
      icon: Calendar,
      description: 'Próximos 30 días',
      color: stats.expiringSoon > 0 ? 'text-orange-600' : 'text-gray-600',
      bgColor: stats.expiringSoon > 0 ? 'bg-orange-100' : 'bg-gray-100',
      badge: stats.expiringSoon > 0,
    },
    {
      title: 'Costo Total',
      value: `$${stats.totalCost.toLocaleString()}`,
      icon: DollarSign,
      description: 'Inversión en licencias',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
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
                {stat.badge && typeof stat.value === 'number' && stat.value > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Atención
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
