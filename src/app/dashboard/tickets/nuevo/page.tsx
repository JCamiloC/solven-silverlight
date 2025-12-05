'use client'

import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { TicketForm } from '@/components/tickets'
import { ArrowLeft } from 'lucide-react'

export default function NuevoTicketPage() {
  const router = useRouter()

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/tickets')}
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

        {/* Formulario */}
        <TicketForm redirectUrl="/dashboard/tickets" />
      </div>
    </ProtectedRoute>
  )
}
