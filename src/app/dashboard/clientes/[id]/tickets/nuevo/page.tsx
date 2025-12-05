'use client'

import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { TicketForm } from '@/components/tickets'
import { useClient } from '@/hooks/use-clients'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function NuevoTicketClientePage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const { data: client, isLoading } = useClient(clientId)

  if (isLoading) {
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/clientes/${clientId}/tickets`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Crear Ticket para {client.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Registra una nueva solicitud de soporte
            </p>
          </div>
        </div>

        {/* Formulario con cliente prellenado */}
        <TicketForm
          clientId={clientId}
          clientName={client.name}
          redirectUrl={`/dashboard/clientes/${clientId}/tickets`}
        />
      </div>
    </ProtectedRoute>
  )
}
