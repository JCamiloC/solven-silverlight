'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useClientTickets, useTickets } from '@/hooks/use-tickets'
import { useAuth } from '@/hooks/use-auth'
import { AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface RecentTicketsProps {
  clientId?: string
}

export function RecentTickets({ clientId }: RecentTicketsProps) {
  const { profile } = useAuth()
  const scopedClientId = clientId ?? profile?.client_id ?? ''
  const isClientScope = Boolean(scopedClientId && profile?.role === 'cliente')

  const { data: allTickets, isLoading: loadingAll } = useTickets({
    enabled: !isClientScope,
  })
  const { data: clientTickets, isLoading: loadingClient } = useClientTickets(
    isClientScope ? scopedClientId : ''
  )

  const tickets = isClientScope ? clientTickets : allTickets
  const isLoading = isClientScope ? loadingClient : loadingAll

  const recentTickets =
    tickets
      ?.slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5) || []

  const ticketsListHref =
    isClientScope && scopedClientId
      ? `/dashboard/clientes/${scopedClientId}/tickets`
      : '/dashboard/tickets'

  const getStatusBadge = (status: string) => {
    const variants = {
      open: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Abierto' },
      in_progress: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Abierto' },
      pendiente_confirmacion: { variant: 'default' as const, icon: Clock, label: 'Pendiente Confirmación' },
      solucionado: { variant: 'secondary' as const, icon: CheckCircle, label: 'Solucionado' },
      resolved: { variant: 'secondary' as const, icon: CheckCircle, label: 'Solucionado' },
      closed: { variant: 'secondary' as const, icon: CheckCircle, label: 'Solucionado' },
    }
    
    const config = variants[status as keyof typeof variants] || variants.open
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'destructive' as const,
      medium: 'default' as const,
      low: 'secondary' as const,
    }
    
    const labels = {
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
    }
    
    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'default'}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tickets Recientes</CardTitle>
            <CardDescription>
              {profile?.role === 'cliente'
                ? 'Últimos tickets de su empresa'
                : 'Últimos tickets del sistema'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={ticketsListHref}>
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : recentTickets.length > 0 ? (
          <div className="space-y-4">
            {recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/tickets/${ticket.id}`}
                className="flex items-center justify-between space-x-4 rounded-md p-2 -mx-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium leading-none truncate">
                      {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`} - {ticket.title}
                    </p>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ticket.category} • {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              No hay tickets recientes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}