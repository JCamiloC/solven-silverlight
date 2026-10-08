'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useHardwareAssets } from '@/hooks/use-hardware'
import { useSoftwareStats } from '@/hooks/use-software'
import { useCustomApplicationsStats } from '@/hooks/use-custom-applications'
import { useAccessStats } from '@/hooks/use-access-credentials'
import { useAuth } from '@/hooks/use-auth'
import { useUsers } from '@/hooks/use-users'
import { 
  HardDrive, 
  Monitor, 
  Key, 
  Users,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export function HardwareOverview() {
  const { data: assets, isLoading: loadingHardware } = useHardwareAssets()
  const { data: softwareStats, isLoading: loadingSoftwareStats } = useSoftwareStats()
  const { data: customAppStats, isLoading: loadingCustomAppStats } = useCustomApplicationsStats()
  const { data: accessStats, error: accessError } = useAccessStats()
  const { hasRole } = useAuth()
  const isAdmin = hasRole(['administrador'])
  const showStaffUsers = hasRole(['administrador', 'lider_soporte'])

  const { data: users = [] } = useUsers({ enabled: showStaffUsers })
  const activeUsersCount = users.length

  const hardwareCount = assets?.length ?? 0
  const licenseCount = softwareStats?.total ?? 0
  const customAppCount = customAppStats?.total ?? 0
  const softwareTotal = licenseCount + customAppCount
  const accessActiveCount = accessError ? 0 : (accessStats?.active ?? 0)
  const isLoading = loadingHardware || loadingSoftwareStats || loadingCustomAppStats

  const systemStatus = [
    {
      name: 'Hardware',
      icon: HardDrive,
      status: `${hardwareCount} activos`,
      count: hardwareCount,
      variant: 'secondary' as const,
    },
    {
      name: 'Software',
      icon: Monitor,
      status: `${customAppCount} apps · ${licenseCount} licencias`,
      count: softwareTotal,
      variant: 'secondary' as const,
    },
    {
      name: 'Accesos',
      icon: Key,
      status: isAdmin ? `${accessActiveCount} credenciales activas` : 'Solo administrador',
      count: isAdmin ? accessActiveCount : 0,
      variant: 'secondary' as const,
    },
    ...(showStaffUsers
      ? [
          {
            name: 'Usuarios',
            icon: Users,
            status: `${activeUsersCount} en plataforma`,
            count: activeUsersCount,
            variant: 'secondary' as const,
          },
        ]
      : []),
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
            <Link href="/dashboard/clientes">
              Ver clientes
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