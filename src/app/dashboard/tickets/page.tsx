'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { TicketTable } from '@/components/tickets'
import { useTickets, useMyTickets } from '@/hooks/use-tickets'
import { useAuth } from '@/hooks/use-auth'
import { Plus } from 'lucide-react'

export default function TicketsPage() {
  const router = useRouter()
  const { user, isClient } = useAuth()
  
  // Si es cliente, usa useMyTickets, sino usa useTickets
  const { data: allTickets, isLoading: loadingAll } = useTickets()
  const { data: myTickets, isLoading: loadingMy } = useMyTickets(user?.id || '')
  
  const tickets = isClient() ? myTickets : allTickets
  const isLoading = isClient() ? loadingMy : loadingAll

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {isClient() ? 'Mis Tickets' : 'Tickets de Soporte'}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isClient() 
                ? 'Gestiona tus solicitudes de soporte' 
                : 'Gestión completa de tickets de soporte'
              }
            </p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/tickets/nuevo')}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear Ticket
          </Button>
        </div>

        {/* Tabla de Tickets */}
        <TicketTable
          tickets={tickets || []}
          isLoading={isLoading}
          showClientColumn={!isClient()}
          emptyMessage={
            isClient() 
              ? 'No tienes tickets registrados' 
              : 'No hay tickets registrados en el sistema'
          }
        />
      </div>
    </ProtectedRoute>
  )
}
