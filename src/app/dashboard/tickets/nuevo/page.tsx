'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { TicketForm } from '@/components/tickets'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

function NuevoTicketFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId') || undefined
  const { isClient, profile } = useAuth()

  const backHref = isClient() && profile?.client_id
    ? `/dashboard/clientes/${profile.client_id}/tickets`
    : clientId
      ? `/dashboard/clientes/${clientId}/tickets`
      : '/dashboard/tickets'

  const redirectUrl = isClient() && profile?.client_id
    ? `/dashboard/clientes/${profile.client_id}/tickets`
    : clientId
      ? `/dashboard/clientes/${clientId}/tickets`
      : '/dashboard/tickets'

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(backHref)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Crear Nuevo Ticket</h1>
          <p className="text-sm text-muted-foreground">
            Registra una nueva solicitud de soporte
          </p>
        </div>
      </div>

      <TicketForm clientId={clientId} redirectUrl={redirectUrl} />
    </div>
  )
}

export default function NuevoTicketPage() {
  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <NuevoTicketFormContent />
      </Suspense>
    </ProtectedRoute>
  )
}
