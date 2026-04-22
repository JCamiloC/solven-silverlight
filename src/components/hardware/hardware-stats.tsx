'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHardwareStatsByClient } from '@/hooks/use-hardware'
import { HardwareAsset } from '@/types'
import {
  Computer,
  Wrench,
  Archive,
  TrendingUp,
  Laptop,
  Monitor,
  Printer,
  Server,
  Smartphone,
  Network,
  Package,
} from 'lucide-react'

interface HardwareStatsProps {
  clientId: string
  assets?: HardwareAsset[]
  showTypeCards?: boolean
}

export function HardwareStats({ clientId, assets = [], showTypeCards = false }: HardwareStatsProps) {
  const { data: stats, isLoading } = useHardwareStatsByClient(clientId)

  const typeCounts = assets.reduce((acc, asset) => {
    const type = (asset.type || '').trim().toLowerCase()
    if (!type) return acc
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const typeCards = [
    {
      title: 'Laptops',
      value: (typeCounts.laptop || 0) + (typeCounts.notebook || 0) + (typeCounts.portatil || 0),
      icon: Laptop,
      color: 'text-indigo-600',
    },
    {
      title: 'Desktop',
      value: (typeCounts.desktop || 0) + (typeCounts.pc || 0) + (typeCounts.escritorio || 0),
      icon: Computer,
      color: 'text-blue-600',
    },
    {
      title: 'Impresoras',
      value: (typeCounts.printer || 0) + (typeCounts.impresora || 0),
      icon: Printer,
      color: 'text-slate-600',
    },
    {
      title: 'Monitores',
      value: (typeCounts.monitor || 0),
      icon: Monitor,
      color: 'text-cyan-600',
    },
    {
      title: 'Servidores',
      value: (typeCounts.server || 0) + (typeCounts.servidor || 0),
      icon: Server,
      color: 'text-violet-600',
    },
    {
      title: 'Celulares',
      value: (typeCounts.celular || 0) + (typeCounts.mobile || 0) + (typeCounts.smartphone || 0),
      icon: Smartphone,
      color: 'text-emerald-600',
    },
    {
      title: 'Red',
      value: (typeCounts.network || 0) + (typeCounts.red || 0),
      icon: Network,
      color: 'text-amber-600',
    },
    {
      title: 'Otros',
      value: (typeCounts.other || 0) + (typeCounts.otro || 0),
      icon: Package,
      color: 'text-zinc-600',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4">
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
        {showTypeCards && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={`type-skeleton-${index}`}>
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
        )}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Activos Tecnológicos',
      value: stats?.total || 0,
      description: 'Activos tecnológicos registrados',
      icon: Computer,
      color: 'text-blue-600',
    },
    {
      title: 'Activos Tecnológicos En Uso',
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
    <div className="space-y-4">
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

      {showTypeCards && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {typeCards.map((typeCard) => {
            const Icon = typeCard.icon
            return (
              <Card key={typeCard.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{typeCard.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${typeCard.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{typeCard.value}</div>
                  <p className="text-xs text-muted-foreground">Activos tecnológicos por tipo</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}