'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { UnderConstruction } from '@/components/ui/under-construction'

export default function TicketsPage() {
  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
      <UnderConstruction 
        moduleName="Sistema de Tickets"
        description="Gestión completa de tickets de soporte y seguimiento de casos"
      />
    </ProtectedRoute>
  )
}
