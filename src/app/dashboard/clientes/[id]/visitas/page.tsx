'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { Card, CardContent } from '@/components/ui/card'
import { useClient } from '@/hooks/use-clients'
import { useClientPermissions } from '@/hooks/use-client-permissions'
import { VisitasView } from '@/components/visitas'

export default function ClienteVisitasPage() {
  const { id } = useParams()
  const router = useRouter()
  const clientId = typeof id === 'string' ? id : ''

  const { readOnly } = useClientPermissions()
  const { data: client, isLoading, error } = useClient(clientId)

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" text="Cargando módulo de visitas..." />
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !client) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-destructive">No se pudo cargar el cliente</h2>
              <p className="text-sm text-muted-foreground">{error?.message || 'Cliente no encontrado'}</p>
              <Button variant="outline" onClick={() => router.push('/dashboard/clientes')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a clientes
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/clientes/${clientId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Visitas de {client.name}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Registro de visitas técnicas, equipos atendidos y tareas realizadas.
            </p>
          </div>
        </div>

        <VisitasView clientId={clientId} clientName={client.name} readOnly={readOnly} />
      </div>
    </ProtectedRoute>
  )
}
