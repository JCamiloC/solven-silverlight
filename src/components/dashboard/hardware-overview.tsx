'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useHardwareAssets } from '@/hooks/use-hardware'
import { useSoftwareStats } from '@/hooks/use-software'
import { useAccessStats } from '@/hooks/use-access-credentials'
import { useAuth } from '@/hooks/use-auth'
import { 
  HardDrive, 
  Monitor, 
  Key, 
  Users,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export function HardwareOverview() {
  const { data: assets, isLoading } = useHardwareAssets()
  const { data: softwareStats } = useSoftwareStats()
  const { data: accessStats, error: accessError } = useAccessStats()
  const { hasRole } = useAuth()
  const isAdmin = hasRole(['administrador'])

  // Get system status overview
  const systemStatus = [
    {
      name: 'Hardware',
      icon: HardDrive,
      status: 'Operativo',
      count: assets?.length || 0,
      variant: 'secondary' as const,
    },
    {
      name: 'Software',
      icon: Monitor,
      status: 'Operativo',
      count: softwareStats?.active || 0,
      variant: 'secondary' as const,
    },
    {
      name: 'Accesos',
      icon: Key,
      status: isAdmin ? 'Operativo' : 'Restringido',
      count: isAdmin ? (accessError ? 0 : (accessStats?.active || 0)) : 0,
      variant: 'secondary' as const,
    },
    {
      name: 'Usuarios',
      icon: Users,
      status: '45 activos',
      count: 45, // TODO: Connect to user data
      variant: 'secondary' as const,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Resumen del Sistema</CardTitle>
            <CardDescription>
              Estado general de los módulos
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/hardware">
              Ver hardware
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                </div>
                <div className="h-6 bg-muted animate-pulse rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : (
          systemStatus.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({item.count})
                  </span>
                </div>
                <Badge variant={item.variant}>{item.status}</Badge>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}