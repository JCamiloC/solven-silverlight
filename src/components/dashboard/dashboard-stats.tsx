'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTickets } from '@/hooks/use-tickets'
import { useAllClientVisits } from '@/hooks/use-visitas'
import { useClients } from '@/hooks/use-clients'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

type DashboardChartRow = {
  name: string
  total: number
}

type TicketStatusLabel = 'Abierto' | 'Pendiente confirmación' | 'Solucionado'

const TICKETS_BY_CLIENT_COLOR = '#0f766e'
const VISITS_BY_CLIENT_COLOR = '#1d4ed8'
const STATUS_COLORS: Record<string, string> = {
  Abierto: '#f59e0b',
  'Pendiente confirmación': '#3b82f6',
  Solucionado: '#10b981',
}

const STATUS_ORDER: TicketStatusLabel[] = ['Abierto', 'Pendiente confirmación', 'Solucionado']

function shortenClientName(name: string, max = 18) {
  if (name.length <= max) return name
  return `${name.slice(0, max - 1)}...`
}

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

function topRowsByTotal(rows: DashboardChartRow[], limit = 8) {
  return rows.sort((a, b) => b.total - a.total).slice(0, limit)
}

export function DashboardStats() {
  const { data: tickets = [], isLoading: ticketsLoading } = useTickets()
  const { data: visits = [], isLoading: visitsLoading } = useAllClientVisits()
  const { data: clients = [], isLoading: clientsLoading } = useClients()

  const isLoading = ticketsLoading || visitsLoading || clientsLoading

  const { ticketsByClient, ticketsByStatus, ticketsByStatusSummary, ticketsLast30DaysTotal, visitsByClient } = useMemo(() => {
    const now = new Date()
    const cutoff = toStartOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
    const clientMap = new Map(clients.map((client) => [client.id, client.name]))

    const recentTickets = tickets.filter((ticket) => {
      const createdAt = new Date(ticket.created_at)
      return createdAt >= cutoff
    })

    const recentVisits = visits.filter((visit) => {
      const visitDate = new Date(visit.fecha_visita)
      return visitDate >= cutoff
    })

    const ticketClientCounter = new Map<string, number>()
    recentTickets.forEach((ticket) => {
      const key = ticket.client_id || 'sin-cliente'
      ticketClientCounter.set(key, (ticketClientCounter.get(key) || 0) + 1)
    })

    const statusCounter = new Map<string, number>()
    recentTickets.forEach((ticket) => {
      const key = toLabelStatus(ticket.status)
      statusCounter.set(key, (statusCounter.get(key) || 0) + 1)
    })

    const visitClientCounter = new Map<string, number>()
    recentVisits.forEach((visit) => {
      const key = visit.client_id || 'sin-cliente'
      visitClientCounter.set(key, (visitClientCounter.get(key) || 0) + 1)
    })

    const ticketsByClientData = topRowsByTotal(
      Array.from(ticketClientCounter.entries()).map(([clientId, total]) => ({
        name: clientMap.get(clientId) || 'Cliente sin nombre',
        total,
      }))
    )

    const ticketsByStatusData = Array.from(statusCounter.entries())
      .map(([name, total]) => ({ name, total }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total)

    const ticketsByStatusSummary = STATUS_ORDER.map((status) => ({
      name: status,
      total: statusCounter.get(status) || 0,
    }))

    const ticketsLast30DaysTotal = recentTickets.length

    const visitsByClientData = topRowsByTotal(
      Array.from(visitClientCounter.entries()).map(([clientId, total]) => ({
        name: clientMap.get(clientId) || 'Cliente sin nombre',
        total,
      }))
    )

    return {
      ticketsByClient: ticketsByClientData,
      ticketsByStatus: ticketsByStatusData,
      ticketsByStatusSummary,
      ticketsLast30DaysTotal,
      visitsByClient: visitsByClientData,
    }
  }, [clients, tickets, visits])

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tickets por cliente</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {isLoading ? (
            <div className="h-full animate-pulse rounded bg-muted" />
          ) : ticketsByClient.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No hay tickets registrados en los últimos 30 días.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ticketsByClient}
                layout="vertical"
                margin={{ top: 8, right: 20, left: 16, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={170}
                  tickFormatter={shortenClientName}
                />
                <Tooltip formatter={(value: number) => [value, 'Tickets']} />
                <Bar dataKey="total" fill={TICKETS_BY_CLIENT_COLOR} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets por estado</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {isLoading ? (
            <div className="h-full animate-pulse rounded bg-muted" />
          ) : ticketsLast30DaysTotal === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No hay estados de tickets para mostrar en los últimos 30 días.
            </div>
          ) : (
            <div className="grid h-full gap-3 md:grid-cols-[1fr_190px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ticketsByStatus}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                    label
                  >
                    {ticketsByStatus.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Tickets']} />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estados activos
                </p>
                {ticketsByStatusSummary.map((status) => {
                  const isActive = status.total > 0

                  return (
                    <div key={status.name} className="flex items-center justify-between rounded-md bg-background px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[status.name] || '#6b7280' }}
                        />
                        <span className="text-xs text-foreground">{status.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold leading-none">{status.total}</p>
                        <p className="text-[10px] text-muted-foreground leading-none mt-1">
                          {isActive ? 'Activo' : 'Sin actividad'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Visitas por cliente</CardTitle>
          <CardDescription>Últimos 30 días (visitas técnicas agrupadas por cliente)</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {isLoading ? (
            <div className="h-full animate-pulse rounded bg-muted" />
          ) : visitsByClient.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No hay visitas registradas en los últimos 30 días.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitsByClient} margin={{ top: 8, right: 20, left: 0, bottom: 32 }}>
                <defs>
                  <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={VISITS_BY_CLIENT_COLOR} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={VISITS_BY_CLIENT_COLOR} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value: number) => [value, 'Visitas']} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={VISITS_BY_CLIENT_COLOR}
                  fill="url(#visitsGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}