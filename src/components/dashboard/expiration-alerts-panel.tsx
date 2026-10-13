'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, ArrowRight, BellRing, Loader2 } from 'lucide-react'
import { useExpirationAlerts } from '@/hooks/use-expiration-alerts'
import type { AlertCategory, ExpirationAlert } from '@/lib/alerts/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const categoryLabels: Record<AlertCategory, string> = {
  hardware_warranty: 'Garantía',
  hardware_os: 'SO',
  hardware_office: 'Office',
  hardware_antivirus: 'Antivirus',
  hardware_software_extra: 'Software adicional (equipo)',
  software_license: 'Licencia software',
  app_domain: 'Dominio',
  app_hosting: 'Hosting',
  app_ssl: 'SSL',
  maintenance_scheduled: 'Mantenimiento',
}

function StatusBadge({ item }: { item: ExpirationAlert }) {
  if (item.severity === 'expired') {
    return (
      <Badge variant="destructive">
        Vencido
        {item.daysUntil < 0 ? ` · hace ${Math.abs(item.daysUntil)} d` : ' · hoy'}
      </Badge>
    )
  }
  return (
    <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-transparent">
      Próximo · {item.daysUntil} d
    </Badge>
  )
}

function rowClass(item: ExpirationAlert) {
  if (item.severity === 'expired') return 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20'
  return 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/15'
}

interface ExpirationAlertsPanelProps {
  title?: string
  description?: string
  limit?: number
  enabled?: boolean
  showViewAllLink?: boolean
}

export function ExpirationAlertsPanel({
  title = 'Alertas de vencimiento',
  description = 'Hardware, software y mantenimientos programados (30 días calendario)',
  limit = 12,
  enabled = true,
  showViewAllLink = false,
}: ExpirationAlertsPanelProps) {
  const { data, isLoading, isError } = useExpirationAlerts(enabled)
  const items = (data?.items || []).slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {data && (
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-transparent">
                {data.warningCount} por vencer
              </Badge>
              <Badge variant="destructive">{data.expiredCount} vencidos</Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando alertas...
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-sm text-destructive py-4">
            <AlertTriangle className="h-4 w-4" />
            No se pudieron cargar las alertas de vencimiento.
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay vencimientos en los próximos 30 días ni ítems vencidos recientes.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${rowClass(item)}`}
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate">{item.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="font-medium text-foreground">{categoryLabels[item.category]}</span>
                    {' · '}
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vence: {format(parseISO(item.dueDate.slice(0, 10)), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge item={item} />
                  <Button variant="outline" size="sm" asChild>
                    <Link href={item.href}>Ver</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {showViewAllLink && (data?.items.length || 0) > limit && (
          <Button variant="ghost" size="sm" className="mt-3" asChild>
            <Link href="/dashboard">
              Ver más en panel
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
