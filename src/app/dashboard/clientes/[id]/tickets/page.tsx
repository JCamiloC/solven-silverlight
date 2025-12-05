'use client'

import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { TicketTable } from '@/components/tickets'
import { useClientTickets } from '@/hooks/use-tickets'
import { useClient } from '@/hooks/use-clients'
import { ArrowLeft, Plus, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function ClienteTicketsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const { data: client, isLoading: loadingClient } = useClient(clientId)
  const { data: tickets, isLoading: loadingTickets } = useClientTickets(clientId)

  if (loadingClient) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Cargando información...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!client) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Cliente no encontrado</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/dashboard/clientes')}
                >
                  Volver a Clientes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/dashboard/clientes/${clientId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Tickets de {client.name}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Gestión de tickets del cliente
              </p>
            </div>
          </div>
          <Button
            onClick={() => router.push(`/dashboard/clientes/${clientId}/tickets/nuevo`)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear Ticket
          </Button>
        </div>

        {/* Tabla de Tickets */}
        <TicketTable
          tickets={tickets || []}
          isLoading={loadingTickets}
          showClientColumn={false}
          emptyMessage={`No hay tickets registrados para ${client.name}`}
        />
      </div>
    </ProtectedRoute>
  )
}
