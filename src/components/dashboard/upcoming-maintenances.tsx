'use client'

import Link from 'next/link'
import { differenceInCalendarDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRight, BellRing, CalendarClock, Loader2 } from 'lucide-react'
import { useUpcomingClientMaintenances } from '@/hooks/use-client-maintenances'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const statusLabels = {
  pendiente: 'Pendiente',
  reprogramado: 'Reprogramado',
  realizado: 'Realizado',
  omitido: 'Omitido',
} as const

const statusVariants = {
  pendiente: 'default' as const,
  reprogramado: 'secondary' as const,
  realizado: 'secondary' as const,
  omitido: 'outline' as const,
}

export function UpcomingMaintenances() {
  const { isAdmin } = useAuth()
  const canView = isAdmin()
  const { data = [], isLoading } = useUpcomingClientMaintenances(5, canView)

  if (!canView) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              Recordatorios de Mantenimiento
            </CardTitle>
            <CardDescription>
              Próximos 5 mantenimientos programados
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
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando mantenimientos próximos...
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay mantenimientos próximos registrados.</p>
        ) : (
          <div className="space-y-3">
            {data.map((maintenance) => {
              const expectedDate = new Date(maintenance.expected_date)
              const daysLeft = differenceInCalendarDays(expectedDate, new Date())
              const status = maintenance.status

              return (
                <div
                  key={maintenance.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{maintenance.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Mantenimiento #{maintenance.slot_number} del {maintenance.year}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {format(expectedDate, 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariants[status] || 'outline'}>
                      {statusLabels[status] || status}
                    </Badge>
                    <Badge variant={daysLeft <= 7 ? 'destructive' : 'secondary'}>
                      {daysLeft === 0 ? 'Hoy' : daysLeft === 1 ? 'Mañana' : `${daysLeft} días`}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/clientes/${maintenance.client_id}/mantenimientos`}>Ver</Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
