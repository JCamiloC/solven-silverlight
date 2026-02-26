'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TicketTable } from '@/components/tickets'
import { useTickets, useMyTickets } from '@/hooks/use-tickets'
import { useAuth } from '@/hooks/use-auth'
import { Plus, FileText, Loader2 } from 'lucide-react'
import { TicketReportPDF } from '@/lib/services/ticket-report-pdf'
import { TicketReportWord } from '@/lib/services/ticket-report-word'
import type { TicketWithRelations } from '@/lib/services/tickets'
import { toast } from 'sonner'

export default function TicketsPage() {
  const router = useRouter()
  const { user, isClient, isAdmin, isLeader, isSupport } = useAuth()
  
  // Si es cliente, usa useMyTickets, sino usa useTickets
  const { data: allTickets, isLoading: loadingAll } = useTickets()
  const { data: myTickets, isLoading: loadingMy } = useMyTickets(user?.id || '')
  
  const tickets = isClient() ? myTickets : allTickets
  const isLoading = isClient() ? loadingMy : loadingAll

  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [filteredTickets, setFilteredTickets] = useState<TicketWithRelations[]>([])
  const [tableFilters, setTableFilters] = useState({
    selectedClient: 'all',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    setFilteredTickets(tickets || [])
  }, [tickets])

  const getReportPeriodSlug = () => {
    const { startDate, endDate } = tableFilters

    if (!startDate && !endDate) {
      return 'total'
    }

    if (startDate && endDate && startDate.slice(0, 7) === endDate.slice(0, 7)) {
      return `mes-${startDate.slice(0, 7)}`
    }

    if (startDate && endDate) {
      return `rango-${startDate}-a-${endDate}`
    }

    if (startDate) {
      return `desde-${startDate}`
    }

    return `hasta-${endDate}`
  }

  const getReportPeriodLabel = () => {
    const { startDate, endDate } = tableFilters

    if (!startDate && !endDate) {
      return 'Total'
    }

    if (startDate && endDate && startDate.slice(0, 7) === endDate.slice(0, 7)) {
      return format(new Date(`${startDate.slice(0, 7)}-01`), 'MMMM yyyy', { locale: es })
    }

    if (startDate && endDate) {
      return `${startDate} a ${endDate}`
    }

    if (startDate) {
      return `Desde ${startDate}`
    }

    return `Hasta ${endDate}`
  }

  const handleGenerateReport = async (format: 'pdf' | 'word') => {
    if (!filteredTickets || filteredTickets.length === 0) {
      toast.error('No hay tickets para generar el reporte')
      return
    }

    setGeneratingReport(true)
    try {
      const reportPeriodSlug = getReportPeriodSlug()
      const reportPeriodLabel = getReportPeriodLabel()

      if (format === 'pdf') {
        await TicketReportPDF.generateReport(filteredTickets, 'Todos los Clientes', true, reportPeriodSlug, reportPeriodLabel)
      } else {
        await TicketReportWord.generateReport(filteredTickets, 'Todos los Clientes', true, reportPeriodSlug, reportPeriodLabel)
      }
      toast.success('Reporte generado exitosamente')
      setReportDialogOpen(false)
    } catch (error) {
      console.error('Error generando reporte:', error)
      toast.error('Error al generar el reporte')
    } finally {
      setGeneratingReport(false)
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
                onClick={() => setReportDialogOpen(true)}
                disabled={generatingReport || isLoading}
                className="w-full sm:w-auto"
              >
                {generatingReport ? (
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
          onFilteredTicketsChange={setFilteredTickets}
          onFiltersChange={setTableFilters}
          showClientColumn={!isClient()}
          emptyMessage={
            isClient() 
              ? 'No tienes tickets registrados' 
              : 'No hay tickets registrados en el sistema'
          }
        />

        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Formato del reporte</DialogTitle>
              <DialogDescription>
                Selecciona el formato para exportar el reporte con los tickets filtrados actualmente ({getReportPeriodLabel()}).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleGenerateReport('word')}
                disabled={generatingReport || isLoading}
              >
                {generatingReport ? 'Generando...' : 'Word'}
              </Button>
              <Button
                onClick={() => handleGenerateReport('pdf')}
                disabled={generatingReport || isLoading}
              >
                {generatingReport ? 'Generando...' : 'PDF'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
