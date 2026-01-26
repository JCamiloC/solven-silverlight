'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { TicketTable } from '@/components/tickets'
import { useTickets, useMyTickets } from '@/hooks/use-tickets'
import { useAuth } from '@/hooks/use-auth'
import { Plus, FileText, Loader2 } from 'lucide-react'
import { TicketReportPDF } from '@/lib/services/ticket-report-pdf'
import { toast } from 'sonner'

export default function TicketsPage() {
  const router = useRouter()
  const { user, isClient, isAdmin, isLeader, isSupport } = useAuth()
  
  // Si es cliente, usa useMyTickets, sino usa useTickets
  const { data: allTickets, isLoading: loadingAll } = useTickets()
  const { data: myTickets, isLoading: loadingMy } = useMyTickets(user?.id || '')
  
  const tickets = isClient() ? myTickets : allTickets
  const isLoading = isClient() ? loadingMy : loadingAll

  const [generatingPDF, setGeneratingPDF] = useState(false)

  const handleGenerateReport = async () => {
    if (!tickets || tickets.length === 0) {
      toast.error('No hay tickets para generar el reporte')
      return
    }

    setGeneratingPDF(true)
    try {
      await TicketReportPDF.generateReport(tickets, 'Todos los Clientes', true)
      toast.success('Reporte generado exitosamente')
    } catch (error) {
      console.error('Error generando reporte:', error)
      toast.error('Error al generar el reporte')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const canGenerateReport = isAdmin() || isLeader() || isSupport()

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
          <div className="flex gap-2">
            {!isClient() && canGenerateReport && (
              <Button
                variant="outline"
                onClick={handleGenerateReport}
                disabled={generatingPDF || isLoading}
                className="w-full sm:w-auto"
              >
                {generatingPDF ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Reporte General
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => router.push('/dashboard/tickets/nuevo')}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Ticket
            </Button>
          </div>
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
