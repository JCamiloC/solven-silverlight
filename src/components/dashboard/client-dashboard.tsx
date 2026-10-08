'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowRight,
  Building2,
  CalendarClock,
  HardDrive,
  MapPin,
  Monitor,
  Ticket,
  Plus,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { resolveEffectiveProfile } from '@/lib/auth/fallback-profile'
import { useClient } from '@/hooks/use-clients'
import { useClientTickets } from '@/hooks/use-tickets'
import { useClientVisits } from '@/hooks/use-visitas'
import { useHardwareAssetsByClient } from '@/hooks/use-hardware'
import { useSoftwareByClient } from '@/hooks/use-software'
import { useCustomApplicationsByClient } from '@/hooks/use-custom-applications'
import { useUpcomingClientMaintenancesForClient } from '@/hooks/use-client-maintenances'
import { RecentTickets } from './recent-tickets'
import { Loading } from '@/components/ui/loading'

const STATUS_COLORS: Record<string, string> = {
  Abierto: '#f59e0b',
  'Pendiente confirmación': '#3b82f6',
  Solucionado: '#10b981',
}

const STATUS_ORDER = ['Abierto', 'Pendiente confirmación', 'Solucionado'] as const

function toStartOfDay(date: Date) {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function toLabelStatus(status: string) {
  if (status === 'open' || status === 'in_progress') return 'Abierto'
  if (status === 'pendiente_confirmacion') return 'Pendiente confirmación'
  return 'Solucionado'
}

function formatTooltipMetric(value: unknown, label: string): [string, string] {
  if (typeof value === 'number') return [String(value), label]
  if (typeof value === 'string') return [value, label]
  return ['0', label]
}

const visitStatusLabels: Record<string, string> = {
  completada: 'Completada',
  pendiente: 'Pendiente',
  cancelada: 'Cancelada',
}

export function ClientDashboard() {
  const { user, profile } = useAuth()
  const effectiveProfile = resolveEffectiveProfile(user, profile)
  const clientId = effectiveProfile?.client_id ?? ''

  const { data: client, isLoading: loadingClient } = useClient(clientId)
  const { data: tickets = [], isLoading: loadingTickets } = useClientTickets(clientId)
  const { data: visits = [], isLoading: loadingVisits } = useClientVisits(clientId)
  const { data: hardware = [], isLoading: loadingHardware } = useHardwareAssetsByClient(clientId)
  const { data: softwareLicenses = [], isLoading: loadingLicenses } = useSoftwareByClient(clientId)
  const { data: customApps = [], isLoading: loadingCustomApps } = useCustomApplicationsByClient(clientId)

  const licenseCount = softwareLicenses.length
  const customAppCount = customApps.length
  const softwareTotal = licenseCount + customAppCount
  const { data: upcomingMaintenance = [], isLoading: loadingMaintenance } =
    useUpcomingClientMaintenancesForClient(clientId, 5)

  const companyHref = clientId ? `/dashboard/clientes/${clientId}` : '/dashboard'

  const {
    ticketsByStatus,
    ticketsByStatusSummary,
    openTickets,
    recentVisitsCount,
    recentVisitsList,
  } = useMemo(() => {
    const now = new Date()
    const cutoff = toStartOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))

    const recentTickets = tickets.filter((ticket) => new Date(ticket.created_at) >= cutoff)
    const statusCounter = new Map<string, number>()
    recentTickets.forEach((ticket) => {
      const key = toLabelStatus(ticket.status)
      statusCounter.set(key, (statusCounter.get(key) || 0) + 1)
    })

    const ticketsByStatusData = STATUS_ORDER.map((name) => ({
      name,
      total: statusCounter.get(name) || 0,
    })).filter((row) => row.total > 0)

    const openCount = tickets.filter(
      (t) => t.status === 'open' || t.status === 'pendiente_confirmacion'
    ).length

    const recentVisits = visits.filter((v) => new Date(v.fecha_visita) >= cutoff)
    const sortedRecentVisits = [...recentVisits]
      .sort((a, b) => new Date(b.fecha_visita).getTime() - new Date(a.fecha_visita).getTime())
      .slice(0, 5)

    return {
      ticketsByStatus: ticketsByStatusData,
      ticketsByStatusSummary: STATUS_ORDER.map((name) => ({
        name,
        total: statusCounter.get(name) || 0,
      })),
      openTickets: openCount,
      recentVisitsCount: recentVisits.length,
      recentVisitsList: sortedRecentVisits,
    }
  }, [tickets, visits])

  const isLoading =
    loadingClient ||
    loadingTickets ||
    loadingVisits ||
    loadingHardware ||
    loadingLicenses ||
    loadingCustomApps

  if (!clientId) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p>Tu usuario no está vinculado a una empresa. Contacta a soporte para activar el acceso.</p>
      </div>
    )
  }

  if (isLoading && !client) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loading size="lg" text="Cargando tu panel..." />
      </div>
    )
  }

  const greetingName = client?.name || 'tu empresa'

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de soporte y actividad de {greetingName}
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link href={`${companyHref}/tickets/nuevo`}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo ticket
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Mi empresa</p>
              <p className="text-lg font-semibold">{client?.name}</p>
              <p className="text-sm text-muted-foreground">
                Hardware, software, accesos, visitas y más en un solo lugar.
              </p>
            </div>
          </div>
          <Button variant="secondary" asChild>
            <Link href={companyHref}>
              Ir a Mi Empresa
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tickets activos</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{openTickets}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Abiertos o pendientes de confirmación
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tickets (30 días)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {tickets.filter((t) => new Date(t.created_at) >= toStartOfDay(new Date(Date.now() - 30 * 86400000))).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Registrados en el último mes
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Visitas técnicas (30 días)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{recentVisitsCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Visitas registradas a tu empresa
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Hardware
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{hardware.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Equipos registrados
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardDescription className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  Software
                </CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {loadingLicenses || loadingCustomApps ? '—' : softwareTotal}
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="h-8 shrink-0" asChild>
                <Link href={`${companyHref}/software`}>Ver software</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{customAppCount}</span> aplicaciones
            personalizadas ·{' '}
            <span className="font-medium text-foreground">{licenseCount}</span> licencias comerciales
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Tickets por estado
            </CardTitle>
            <CardDescription>Últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingTickets ? (
              <div className="h-full animate-pulse rounded bg-muted" />
            ) : ticketsByStatus.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No hay tickets en los últimos 30 días.
              </div>
            ) : (
              <div className="grid h-full gap-3 md:grid-cols-[1fr_180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketsByStatus}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      label
                    >
                      {ticketsByStatus.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatTooltipMetric(value, 'Tickets')} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  {ticketsByStatusSummary.map((status) => (
                    <div
                      key={status.name}
                      className="flex items-center justify-between rounded-md bg-background px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[status.name] || '#6b7280' }}
                        />
                        <span className="text-xs">{status.name}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{status.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Visitas recientes
                </CardTitle>
                <CardDescription>Últimos 30 días</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`${companyHref}/visitas`}>
                  Ver todas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingVisits ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : recentVisitsList.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay visitas registradas en el último mes.
              </p>
            ) : (
              <ul className="space-y-3">
                {recentVisitsList.map((visit) => (
                  <li
                    key={visit.id}
                    className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize">{visit.tipo.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{visit.detalle}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(visit.fecha_visita), 'dd MMM yyyy', { locale: es })}
                        {visit.equipos?.length ? ` · ${visit.equipos.length} equipo(s)` : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {visitStatusLabels[visit.estado] || visit.estado}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Próximos mantenimientos
              </CardTitle>
              <CardDescription>Agenda programada para tu empresa</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${companyHref}/mantenimientos`}>
                Ver agenda
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMaintenance ? (
            <div className="h-20 animate-pulse rounded bg-muted" />
          ) : upcomingMaintenance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay mantenimientos próximos en calendario.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingMaintenance.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    Mantenimiento #{row.slot_number} · {row.year}
                  </span>
                  <span className="text-muted-foreground">
                    {format(new Date(row.expected_date), 'dd MMM yyyy', { locale: es })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <RecentTickets clientId={clientId} />
    </div>
  )
}
