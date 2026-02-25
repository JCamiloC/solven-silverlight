'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTickets } from '@/hooks/use-tickets'
import { useAuth } from '@/hooks/use-auth'
import { AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

export function RecentTickets() {
  const { profile } = useAuth()
  const { data: tickets, isLoading } = useTickets()

  // Get recent tickets (last 5)
  const recentTickets = tickets?.slice(0, 5) || []

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
              Últimos tickets {profile?.role === 'cliente' ? 'creados por usted' : 'del sistema'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/tickets">
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
              <div key={ticket.id} className="flex items-center justify-between space-x-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium leading-none">
                      {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`} - {ticket.title}
                    </p>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ticket.category} • {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              </div>
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