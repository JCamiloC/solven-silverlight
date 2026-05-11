'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, FileText, Eye, Download } from 'lucide-react'
import { useClients } from '@/hooks/use-clients'
import { useMaintenanceReport, useExportMaintenancePDF, useExportMaintenanceWord } from '@/hooks/use-maintenance-reports'
import { useTickets } from '@/hooks/use-tickets'
import { useAllClientVisits } from '@/hooks/use-visitas'
import { useAssignableUsers } from '@/hooks/use-users'
import { MaintenanceReportFilters } from '@/types'
import { TicketReportPDF } from '@/lib/services/ticket-report-pdf'
import { TicketReportWord } from '@/lib/services/ticket-report-word'
import { TicketKpiReportPDF } from '@/lib/services/ticket-kpi-report-pdf'
import { TicketKpiReportWord } from '@/lib/services/ticket-kpi-report-word'
import { buildTicketKpiReportData } from '@/lib/services/ticket-kpi-report-utils'
import { VisitReportPDF, VisitReportRow } from '@/lib/services/visit-report-pdf'
import { VisitReportWord } from '@/lib/services/visit-report-word'
import { VisitDetailPDF } from '@/lib/services/visit-detail-pdf'
import type { TicketWithRelations } from '@/lib/services/tickets'
import type { ClientVisit, MaintenanceReportRow } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

type ReportType = 'mantenimiento' | 'tickets' | 'visitas' | 'kpis' | null

interface SharedReportFilters {
  clientId: string
  startDate: string
  endDate: string
  seguimientoTipo: 'all' | 'mantenimiento_programado' | 'mantenimiento_no_programado' | 'soporte_remoto' | 'soporte_en_sitio'
  accionEstado: 'all' | 'realizado' | 'no_realizado'
}

const seguimientoTipoLabels: Record<SharedReportFilters['seguimientoTipo'], string> = {
  all: 'Todos',
  mantenimiento_programado: 'Mantenimiento programado',
  mantenimiento_no_programado: 'Mantenimiento no programado',
  soporte_remoto: 'Soporte remoto',
  soporte_en_sitio: 'Soporte en sitio',
}

const accionEstadoLabels: Record<SharedReportFilters['accionEstado'], string> = {
  all: 'Todos',
  realizado: 'Realizado',
  no_realizado: 'No realizado',
}

const priorityLabels: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
}

const statusLabels: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'Abierto',
  pendiente_confirmacion: 'Pendiente Confirmación',
  solucionado: 'Solucionado',
  resolved: 'Solucionado',
  closed: 'Solucionado',
}

const visitTypeLabels: Record<string, string> = {
  programada: 'Programada',
  no_programada: 'No programada',
  diagnostico: 'Diagnóstico',
  mantenimiento: 'Mantenimiento',
  soporte: 'Soporte en sitio',
  otro: 'Otro',
}

const visitStatusLabels: Record<string, string> = {
  completada: 'Completada',
  pendiente: 'Pendiente',
  cancelada: 'Cancelada',
}

const toTimestamp = (value: string, endOfDay = false) => {
  if (!value) return null
  const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'
  const parsed = new Date(`${value}${suffix}`)
  const time = parsed.getTime()
  return Number.isNaN(time) ? null : time
}

const inDateRange = (dateValue: string, startDate: string, endDate: string) => {
  const target = new Date(dateValue).getTime()
  if (Number.isNaN(target)) return false

  const start = toTimestamp(startDate, false)
  const end = toTimestamp(endDate, true)

  if (start !== null && target < start) return false
  if (end !== null && target > end) return false
  return true
}

const getPeriodSlug = (filters: SharedReportFilters) => {
  const { startDate, endDate } = filters
  if (!startDate && !endDate) return 'total'
  if (startDate && endDate && startDate.slice(0, 7) === endDate.slice(0, 7)) {
    return `mes-${startDate.slice(0, 7)}`
  }
  if (startDate && endDate) return `rango-${startDate}-a-${endDate}`
  if (startDate) return `desde-${startDate}`
  return `hasta-${endDate}`
}

const getPeriodLabel = (filters: SharedReportFilters) => {
  const { startDate, endDate } = filters
  if (!startDate && !endDate) return 'Total'
  if (startDate && endDate && startDate.slice(0, 7) === endDate.slice(0, 7)) {
    return startDate.slice(0, 7)
  }
  if (startDate && endDate) return `${startDate} a ${endDate}`
  if (startDate) return `Desde ${startDate}`
  return `Hasta ${endDate}`
}

export default function ReportsPage() {
  const router = useRouter()
  const currentDate = new Date()
  const pad = (value: number) => value.toString().padStart(2, '0')
  const defaultEndDate = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`
  const defaultStartDate = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-01`

  const [selectedReport, setSelectedReport] = useState<ReportType>(null)
  const [isExportingTickets, setIsExportingTickets] = useState(false)
  const [isExportingVisits, setIsExportingVisits] = useState(false)
  const [isExportingVisitDetail, setIsExportingVisitDetail] = useState(false)
  const [isExportingKpis, setIsExportingKpis] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailType, setDetailType] = useState<ReportType>(null)
  const [selectedMaintenanceRow, setSelectedMaintenanceRow] = useState<MaintenanceReportRow | null>(null)
  const [selectedVisitRow, setSelectedVisitRow] = useState<ClientVisit | null>(null)

  const [filters, setFilters] = useState<SharedReportFilters>({
    clientId: 'all',
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    seguimientoTipo: 'all',
    accionEstado: 'all',
  })

  const [shouldFetchMaintenance, setShouldFetchMaintenance] = useState(false)
  const [shouldFetchTickets, setShouldFetchTickets] = useState(false)
  const [shouldFetchVisits, setShouldFetchVisits] = useState(false)
  const [shouldFetchKpis, setShouldFetchKpis] = useState(false)

  const { data: clients } = useClients()
  const { data: tickets = [], isLoading: ticketsLoading } = useTickets()
  const { data: visits = [], isLoading: visitsLoading } = useAllClientVisits()
  const { data: assignableUsers = [] } = useAssignableUsers()

  const maintenanceFilters: MaintenanceReportFilters = {
    reportType: 'hardware',
    clientId: filters.clientId === 'all' ? '' : filters.clientId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    seguimientoTipo: filters.seguimientoTipo,
    accionEstado: filters.accionEstado,
  }

  const {
    data: maintenanceRows,
    isLoading: maintenanceLoading,
    isFetching: maintenanceFetching,
  } = useMaintenanceReport(maintenanceFilters, shouldFetchMaintenance)

  const exportWord = useExportMaintenanceWord()
  const exportPDF = useExportMaintenancePDF()

  const selectedClient = clients?.find((c) => c.id === filters.clientId)

  const ticketRows = useMemo(() => {
    if (!shouldFetchTickets && !shouldFetchKpis) return [] as TicketWithRelations[]

    return tickets.filter((ticket) => {
      const byClient = filters.clientId === 'all' || ticket.client_id === filters.clientId
      const byDate = inDateRange(ticket.created_at, filters.startDate, filters.endDate)
      return byClient && byDate
    })
  }, [tickets, filters, shouldFetchTickets, shouldFetchKpis])

  const assignedUserMap = useMemo(() => {
    return assignableUsers.reduce<Record<string, string>>((acc, user) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
      acc[user.id] = fullName || user.email || 'Sin asignar'
      return acc
    }, {})
  }, [assignableUsers])

  const kpiReportData = useMemo(() => {
    if (!shouldFetchKpis) return null
    return buildTicketKpiReportData(ticketRows, assignedUserMap)
  }, [ticketRows, assignedUserMap, shouldFetchKpis])

  const visitRows = useMemo(() => {
    if (!shouldFetchVisits) return [] as typeof visits

    return visits.filter((visit) => {
      const byClient = filters.clientId === 'all' || visit.client_id === filters.clientId
      const byDate = inDateRange(visit.fecha_visita, filters.startDate, filters.endDate)
      return byClient && byDate
    })
  }, [visits, filters, shouldFetchVisits])

  const visitExportRows = useMemo<VisitReportRow[]>(() => {
    const clientMap = new Map((clients || []).map((client) => [client.id, client.name]))

    return visitRows.map((visit) => {
      const technician = visit.tecnico
        ? `${visit.tecnico.first_name || ''} ${visit.tecnico.last_name || ''}`.trim() || '-'
        : '-'

      const equipmentList =
        visit.equipos.length > 0
          ? visit.equipos
              .map((equipment) => equipment.hardware?.name || equipment.hardware_nombre_manual || 'Sin especificar')
              .join(', ')
          : 'Sin equipo asociado'

      return {
        id: visit.id,
        fecha: new Date(visit.fecha_visita).toLocaleDateString('es-CO'),
        cliente: clientMap.get(visit.client_id) || 'Cliente desconocido',
        tipo: visitTypeLabels[visit.tipo] || visit.tipo,
        estado: visitStatusLabels[visit.estado] || visit.estado,
        tecnico: technician,
        equipos: equipmentList,
        detalle: visit.detalle || '-',
        recomendaciones: visit.recomendaciones || '-',
      }
    })
  }, [visitRows, clients])

  const reportTitleBase =
    filters.clientId === 'all'
      ? 'Todos los Clientes'
      : selectedClient?.name || 'Cliente'

  const updateFilters = (next: Partial<SharedReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }))
    setShouldFetchMaintenance(false)
    setShouldFetchTickets(false)
    setShouldFetchVisits(false)
    setShouldFetchKpis(false)
  }

  const handleGenerateReport = () => {
    if (selectedReport === 'mantenimiento') {
      if (filters.clientId === 'all') {
        toast.error('Selecciona un cliente para el reporte de mantenimiento')
        return
      }
      setShouldFetchMaintenance(true)
      return
    }

    if (selectedReport === 'tickets') {
      setShouldFetchTickets(true)
      return
    }

    if (selectedReport === 'visitas') {
      setShouldFetchVisits(true)
      return
    }

    if (selectedReport === 'kpis') {
      setShouldFetchKpis(true)
    }
  }

  const handleExportWord = () => {
    if (!maintenanceRows || !selectedClient) return
    exportWord.mutate({
      rows: maintenanceRows,
      clientName: selectedClient.name,
      startDate: filters.startDate,
      endDate: filters.endDate,
    })
  }

  const handleExportMaintenancePDF = () => {
    if (!maintenanceRows || !selectedClient) return
    exportPDF.mutate({
      rows: maintenanceRows,
      clientName: selectedClient.name,
      startDate: filters.startDate,
      endDate: filters.endDate,
    })
  }

  const handleExportTicketReport = async (format: 'pdf' | 'word') => {
    if (!ticketRows.length) {
      toast.error('No hay tickets para exportar')
      return
    }

    setIsExportingTickets(true)
    const periodSlug = getPeriodSlug(filters)
    const periodLabel = getPeriodLabel(filters)
    const isGeneral = filters.clientId === 'all'

    try {
      if (format === 'pdf') {
        await TicketReportPDF.generateReport(ticketRows, reportTitleBase, isGeneral, periodSlug, periodLabel)
      } else {
        await TicketReportWord.generateReport(ticketRows, reportTitleBase, isGeneral, periodSlug, periodLabel)
      }
      toast.success(`Reporte de tickets en ${format.toUpperCase()} generado`) 
    } catch (error) {
      console.error('Error exportando reporte de tickets:', error)
      toast.error('No se pudo exportar el reporte de tickets')
    } finally {
      setIsExportingTickets(false)
    }
  }

  const handleExportVisitReport = async (format: 'pdf' | 'word') => {
    if (!visitExportRows.length) {
      toast.error('No hay visitas para exportar')
      return
    }

    setIsExportingVisits(true)
    const periodSlug = getPeriodSlug(filters)
    const periodLabel = getPeriodLabel(filters)

    try {
      if (format === 'pdf') {
        await VisitReportPDF.generateReport(visitExportRows, reportTitleBase, periodSlug, periodLabel)
      } else {
        await VisitReportWord.generateReport(visitExportRows, reportTitleBase, periodSlug, periodLabel)
      }
      toast.success(`Reporte de visitas en ${format.toUpperCase()} generado`)
    } catch (error) {
      console.error('Error exportando reporte de visitas:', error)
      toast.error('No se pudo exportar el reporte de visitas')
    } finally {
      setIsExportingVisits(false)
    }
  }

  const handleExportKpiReport = async (format: 'pdf' | 'word') => {
    if (!ticketRows.length) {
      toast.error('No hay tickets para exportar en KPIs')
      return
    }

    setIsExportingKpis(true)
    const periodSlug = getPeriodSlug(filters)
    const periodLabel = getPeriodLabel(filters)
    const isGeneral = filters.clientId === 'all'

    try {
      if (format === 'pdf') {
        await TicketKpiReportPDF.generateReport(ticketRows, {
          clientName: reportTitleBase,
          isGeneralReport: isGeneral,
          reportPeriodSlug: periodSlug,
          reportPeriodLabel: periodLabel,
          startDate: filters.startDate,
          endDate: filters.endDate,
          assignedUserNames: assignedUserMap,
        })
      } else {
        await TicketKpiReportWord.generateReport(ticketRows, {
          clientName: reportTitleBase,
          isGeneralReport: isGeneral,
          reportPeriodSlug: periodSlug,
          startDate: filters.startDate,
          endDate: filters.endDate,
          assignedUserNames: assignedUserMap,
        })
      }
      toast.success(`Reporte KPI en ${format.toUpperCase()} generado`)
    } catch (error) {
      console.error('Error exportando reporte KPI:', error)
      toast.error('No se pudo exportar el reporte KPI')
    } finally {
      setIsExportingKpis(false)
    }
  }

  const getAssignedUserName = (assignedTo?: string) => {
    if (!assignedTo) return 'Sin asignar'
    const assignedUser = assignableUsers.find((user) => user.id === assignedTo)
    if (!assignedUser) return 'Sin asignar'
    return `${assignedUser.first_name} ${assignedUser.last_name}`.trim()
  }

  const openMaintenanceDetail = (row: MaintenanceReportRow) => {
    setDetailType('mantenimiento')
    setSelectedMaintenanceRow(row)
    setSelectedVisitRow(null)
    setDetailOpen(true)
  }

  const openTicketDetail = (ticket: TicketWithRelations) => {
    router.push(`/dashboard/tickets/${ticket.id}?from=reportes`)
  }

  const openVisitDetail = (visit: ClientVisit) => {
    setDetailType('visitas')
    setSelectedVisitRow(visit)
    setSelectedMaintenanceRow(null)
    setDetailOpen(true)
  }

  const handleExportVisitDetailPDF = async (visit: ClientVisit) => {
    const clientName = clients?.find((client) => client.id === visit.client_id)?.name || 'Cliente'
    setIsExportingVisitDetail(true)

    try {
      await VisitDetailPDF.generateVisitPDF(visit, clientName)
      toast.success('PDF individual de visita generado')
    } catch (error) {
      console.error('Error exportando detalle de visita:', error)
      toast.error('No se pudo generar el PDF individual de visita')
    } finally {
      setIsExportingVisitDetail(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
          <p className="text-muted-foreground">
            Genera reportes personalizados según tus necesidades
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tipo de Reporte</CardTitle>
            <CardDescription>
              Selecciona el tipo de reporte que deseas generar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedReport === 'mantenimiento' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setSelectedReport('mantenimiento')
                  setShouldFetchMaintenance(false)
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <FileText className="h-12 w-12 text-primary" />
                    <h3 className="font-semibold text-lg">Reporte de Mantenimiento</h3>
                    <p className="text-sm text-muted-foreground">
                      Genera reportes de mantenimientos realizados por cliente y período
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${selectedReport === 'tickets' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setSelectedReport('tickets')
                  setShouldFetchTickets(false)
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <FileText className="h-12 w-12 text-primary" />
                    <h3 className="font-semibold text-lg">Reporte de Tickets</h3>
                    <p className="text-sm text-muted-foreground">
                      Reporte general de tickets por cliente y rango de fechas
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${selectedReport === 'visitas' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setSelectedReport('visitas')
                  setShouldFetchVisits(false)
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <FileText className="h-12 w-12 text-primary" />
                    <h3 className="font-semibold text-lg">Reporte de Visitas</h3>
                    <p className="text-sm text-muted-foreground">
                      Seguimiento de visitas técnicas por cliente y periodo
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${selectedReport === 'kpis' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setSelectedReport('kpis')
                  setShouldFetchKpis(false)
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <FileText className="h-12 w-12 text-primary" />
                    <h3 className="font-semibold text-lg">Reporte de KPIs</h3>
                    <p className="text-sm text-muted-foreground">
                      Indicadores SLA por prioridad, tiempos y cumplimiento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {selectedReport && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Filtros de Reporte</CardTitle>
                <CardDescription>
                  Selecciona cliente y rango de fechas para generar el informe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={filters.clientId}
                      onChange={(event) => updateFilters({ clientId: event.target.value })}
                    >
                      <option value="all">Todos los clientes</option>
                      {clients?.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha inicio</Label>
                    <Input
                      type="date"
                      value={filters.startDate ?? ''}
                      max={filters.endDate ?? ''}
                      onChange={(e) => updateFilters({ startDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha fin</Label>
                    <Input
                      type="date"
                      value={filters.endDate ?? ''}
                      min={filters.startDate ?? ''}
                      onChange={(e) => updateFilters({ endDate: e.target.value })}
                    />
                  </div>
                </div>

                {selectedReport === 'mantenimiento' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de seguimiento</Label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={filters.seguimientoTipo}
                        onChange={(event) => updateFilters({ seguimientoTipo: event.target.value as SharedReportFilters['seguimientoTipo'] })}
                      >
                        <option value="all">Todos</option>
                        <option value="mantenimiento_programado">Mantenimiento programado</option>
                        <option value="mantenimiento_no_programado">Mantenimiento no programado</option>
                        <option value="soporte_remoto">Soporte remoto</option>
                        <option value="soporte_en_sitio">Soporte en sitio</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estado de acción recomendada</Label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={filters.accionEstado}
                        onChange={(event) => updateFilters({ accionEstado: event.target.value as SharedReportFilters['accionEstado'] })}
                      >
                        <option value="all">Todos</option>
                        <option value="realizado">Realizado</option>
                        <option value="no_realizado">No realizado</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={
                      !filters.startDate ||
                      !filters.endDate ||
                      maintenanceLoading ||
                      maintenanceFetching ||
                      ticketsLoading ||
                      visitsLoading
                    }
                  >
                    {(maintenanceLoading || maintenanceFetching || ticketsLoading || visitsLoading) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Generar Reporte
                  </Button>

                  {selectedReport === 'mantenimiento' && maintenanceRows && maintenanceRows.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleExportMaintenancePDF}
                        disabled={exportPDF.isPending}
                      >
                        {exportPDF.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        Exportar PDF
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleExportWord}
                        disabled={exportWord.isPending}
                      >
                        {exportWord.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        Exportar Word
                      </Button>
                    </>
                  )}

                  {selectedReport === 'tickets' && shouldFetchTickets && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleExportTicketReport('word')}
                        disabled={isExportingTickets || ticketRows.length === 0}
                      >
                        {isExportingTickets ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        Exportar Word
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleExportTicketReport('pdf')}
                        disabled={isExportingTickets || ticketRows.length === 0}
                      >
                        {isExportingTickets ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        Exportar PDF
                      </Button>
                    </>
                  )}

                  {selectedReport === 'visitas' && shouldFetchVisits && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleExportVisitReport('word')}
                        disabled={isExportingVisits || visitExportRows.length === 0}
                      >
                        {isExportingVisits ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        Exportar Word
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleExportVisitReport('pdf')}
                        disabled={isExportingVisits || visitExportRows.length === 0}
                      >
                        {isExportingVisits ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        Exportar PDF
                      </Button>
                    </>
                  )}

                  {selectedReport === 'kpis' && shouldFetchKpis && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleExportKpiReport('word')}
                        disabled={isExportingKpis || ticketRows.length === 0}
                      >
                        {isExportingKpis ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        Exportar Word
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleExportKpiReport('pdf')}
                        disabled={isExportingKpis || ticketRows.length === 0}
                      >
                        {isExportingKpis ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        Exportar PDF
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedReport === 'mantenimiento' && maintenanceRows && maintenanceRows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultados del Reporte</CardTitle>
                  <CardDescription>
                    {maintenanceRows.length} registro(s) encontrado(s) para {selectedClient?.name} entre {filters.startDate} y {filters.endDate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Seguimiento</TableHead>
                          <TableHead>Estado acción</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Procesador</TableHead>
                          <TableHead>RAM</TableHead>
                          <TableHead>Disco</TableHead>
                          <TableHead>Pantalla</TableHead>
                          <TableHead>Office</TableHead>
                          <TableHead>Antivirus</TableHead>
                          <TableHead>S.O.</TableHead>
                          <TableHead className="min-w-[200px]">Detalle</TableHead>
                          <TableHead className="min-w-[220px]">Acción recomendada</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenanceRows.map((row) => (
                          <TableRow key={row.rowNumber}>
                            <TableCell className="font-medium">{row.rowNumber}</TableCell>
                            <TableCell>{seguimientoTipoLabels[(row.seguimientoTipo as SharedReportFilters['seguimientoTipo']) || 'all'] || row.seguimientoTipo}</TableCell>
                            <TableCell>{accionEstadoLabels[(row.accionRecomendadaEstado as SharedReportFilters['accionEstado']) || 'no_realizado'] || row.accionRecomendadaEstado}</TableCell>
                            <TableCell>{row.usuario}</TableCell>
                            <TableCell>{row.equipoNombre}</TableCell>
                            <TableCell>{row.tipo}</TableCell>
                            <TableCell>{row.procesador}</TableCell>
                            <TableCell>{row.ram}</TableCell>
                            <TableCell>{row.disco}</TableCell>
                            <TableCell>{row.tipoPantalla}</TableCell>
                            <TableCell>{row.office}</TableCell>
                            <TableCell>{row.antivirus}</TableCell>
                            <TableCell>{row.sistemaOperativo}</TableCell>
                            <TableCell className="max-w-[300px] whitespace-normal break-words" title={row.detalleSeguimiento}>
                              {row.detalleSeguimiento}
                            </TableCell>
                            <TableCell className="max-w-[320px] whitespace-normal break-words" title={row.accionRecomendada}>
                              {row.accionRecomendada}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => openMaintenanceDetail(row)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalle
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedReport === 'tickets' && shouldFetchTickets && ticketRows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultados del Reporte</CardTitle>
                  <CardDescription>
                    {ticketRows.length} ticket(s) encontrado(s) entre {filters.startDate} y {filters.endDate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="min-w-[240px]">Título</TableHead>
                          <TableHead>Usuario afectado</TableHead>
                          <TableHead>Prioridad</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Responsable</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ticketRows.map((ticket) => {
                          const clientName = clients?.find((client) => client.id === ticket.client_id)?.name || 'N/A'

                          return (
                            <TableRow key={ticket.id}>
                              <TableCell>{ticket.ticket_number || `#${ticket.id.slice(-8)}`}</TableCell>
                              <TableCell>{clientName}</TableCell>
                              <TableCell className="max-w-[280px] whitespace-normal break-words" title={ticket.title}>
                                {ticket.title}
                              </TableCell>
                              <TableCell>{ticket.usuario_afectado?.trim() || 'No especificado'}</TableCell>
                              <TableCell>{priorityLabels[ticket.priority] || ticket.priority}</TableCell>
                              <TableCell>{statusLabels[ticket.status as string] || ticket.status}</TableCell>
                              <TableCell>{getAssignedUserName(ticket.assigned_to)}</TableCell>
                              <TableCell>{new Date(ticket.created_at).toLocaleDateString('es-CO')}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => openTicketDetail(ticket)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalle
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedReport === 'visitas' && shouldFetchVisits && visitRows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultados del Reporte</CardTitle>
                  <CardDescription>
                    {visitRows.length} visita(s) encontrada(s) entre {filters.startDate} y {filters.endDate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Técnico</TableHead>
                          <TableHead className="min-w-[220px]">Equipos</TableHead>
                          <TableHead className="min-w-[220px]">Detalle</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visitRows.map((visit) => {
                          const clientName = clients?.find((client) => client.id === visit.client_id)?.name || 'N/A'
                          const technician = visit.tecnico
                            ? `${visit.tecnico.first_name || ''} ${visit.tecnico.last_name || ''}`.trim() || '-'
                            : '-'
                          const equipments =
                            visit.equipos.length > 0
                              ? visit.equipos
                                  .map((equipment) => equipment.hardware?.name || equipment.hardware_nombre_manual || 'Sin especificar')
                                  .join(', ')
                              : 'Sin equipo asociado'

                          return (
                            <TableRow key={visit.id}>
                              <TableCell>{new Date(visit.fecha_visita).toLocaleDateString('es-CO')}</TableCell>
                              <TableCell>{clientName}</TableCell>
                              <TableCell>{visitTypeLabels[visit.tipo] || visit.tipo}</TableCell>
                              <TableCell>{visitStatusLabels[visit.estado] || visit.estado}</TableCell>
                              <TableCell>{technician}</TableCell>
                              <TableCell className="max-w-[260px] whitespace-normal break-words" title={equipments}>
                                {equipments}
                              </TableCell>
                              <TableCell className="max-w-[260px] whitespace-normal break-words" title={visit.detalle}>
                                {visit.detalle}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openVisitDetail(visit)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver detalle
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExportVisitDetailPDF(visit)}
                                    disabled={isExportingVisitDetail}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    PDF
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedReport === 'kpis' && shouldFetchKpis && kpiReportData && kpiReportData.rows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultados del Reporte KPI</CardTitle>
                  <CardDescription>
                    {kpiReportData.rows.length} ticket(s) incluido(s) entre {filters.startDate} y {filters.endDate}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>FECHA</TableHead>
                          <TableHead className="min-w-[240px]">ACTIVIDAD</TableHead>
                          <TableHead>T.RTA</TableHead>
                          <TableHead>T.RES</TableHead>
                          <TableHead>Criticidad</TableHead>
                          <TableHead>Cumple</TableHead>
                          <TableHead>PERSONA QUE RECIBE</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kpiReportData.rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.fecha}</TableCell>
                            <TableCell className="max-w-[340px] whitespace-normal break-words" title={row.actividad}>
                              {row.actividad}
                            </TableCell>
                            <TableCell>{row.tiempoRespuesta}</TableCell>
                            <TableCell>{row.tiempoSolucion}</TableCell>
                            <TableCell>{row.criticidad}</TableCell>
                            <TableCell>{row.cumple}</TableCell>
                            <TableCell>{row.personaQueRecibe}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedReport === 'mantenimiento' &&
              maintenanceRows &&
              maintenanceRows.length === 0 &&
              shouldFetchMaintenance &&
              !maintenanceLoading &&
              !maintenanceFetching && (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center text-muted-foreground">
                    <p>No se encontraron registros de mantenimiento para este cliente en el rango de fechas seleccionado.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedReport === 'tickets' && shouldFetchTickets && ticketRows.length === 0 && !ticketsLoading && (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center text-muted-foreground">
                    <p>No se encontraron tickets en el rango de fechas seleccionado.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedReport === 'visitas' && shouldFetchVisits && visitRows.length === 0 && !visitsLoading && (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center text-muted-foreground">
                    <p>No se encontraron visitas en el rango de fechas seleccionado.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedReport === 'kpis' && shouldFetchKpis && ticketRows.length === 0 && !ticketsLoading && (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center text-muted-foreground">
                    <p>No se encontraron tickets para construir el reporte KPI en el rango de fechas seleccionado.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Detalle del reporte</DialogTitle>
                  <DialogDescription>
                    Vista completa del registro seleccionado.
                  </DialogDescription>
                </DialogHeader>

                {detailType === 'mantenimiento' && selectedMaintenanceRow && (
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><span className="font-semibold">Usuario:</span> {selectedMaintenanceRow.usuario}</div>
                      <div><span className="font-semibold">Equipo:</span> {selectedMaintenanceRow.equipoNombre}</div>
                      <div><span className="font-semibold">Tipo:</span> {selectedMaintenanceRow.tipo}</div>
                      <div><span className="font-semibold">Seguimiento:</span> {seguimientoTipoLabels[(selectedMaintenanceRow.seguimientoTipo as SharedReportFilters['seguimientoTipo']) || 'all'] || selectedMaintenanceRow.seguimientoTipo}</div>
                      <div><span className="font-semibold">Estado acción:</span> {accionEstadoLabels[(selectedMaintenanceRow.accionRecomendadaEstado as SharedReportFilters['accionEstado']) || 'no_realizado'] || selectedMaintenanceRow.accionRecomendadaEstado}</div>
                      <div><span className="font-semibold">Fecha:</span> {new Date(selectedMaintenanceRow.fechaSeguimiento).toLocaleString('es-CO')}</div>
                      <div><span className="font-semibold">Procesador:</span> {selectedMaintenanceRow.procesador}</div>
                      <div><span className="font-semibold">RAM:</span> {selectedMaintenanceRow.ram}</div>
                      <div><span className="font-semibold">Disco:</span> {selectedMaintenanceRow.disco}</div>
                      <div><span className="font-semibold">S.O.:</span> {selectedMaintenanceRow.sistemaOperativo}</div>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Detalle</p>
                      <p className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap break-words">{selectedMaintenanceRow.detalleSeguimiento}</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Acción recomendada</p>
                      <p className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap break-words">{selectedMaintenanceRow.accionRecomendada}</p>
                    </div>
                  </div>
                )}

                {detailType === 'visitas' && selectedVisitRow && (
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportVisitDetailPDF(selectedVisitRow)}
                        disabled={isExportingVisitDetail}
                      >
                        {isExportingVisitDetail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Exportar PDF individual
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><span className="font-semibold">Fecha:</span> {new Date(selectedVisitRow.fecha_visita).toLocaleString('es-CO')}</div>
                      <div><span className="font-semibold">Cliente:</span> {clients?.find((client) => client.id === selectedVisitRow.client_id)?.name || 'N/A'}</div>
                      <div><span className="font-semibold">Tipo:</span> {visitTypeLabels[selectedVisitRow.tipo] || selectedVisitRow.tipo}</div>
                      <div><span className="font-semibold">Estado:</span> {visitStatusLabels[selectedVisitRow.estado] || selectedVisitRow.estado}</div>
                      <div className="md:col-span-2"><span className="font-semibold">Técnico:</span> {selectedVisitRow.tecnico ? `${selectedVisitRow.tecnico.first_name || ''} ${selectedVisitRow.tecnico.last_name || ''}`.trim() || '-' : '-'}</div>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">Detalle</p>
                      <p className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap break-words">{selectedVisitRow.detalle}</p>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">Actividades</p>
                      <p className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap break-words">
                        {selectedVisitRow.actividades.length > 0 ? selectedVisitRow.actividades.join(', ') : 'Sin actividades registradas'}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">Recomendaciones</p>
                      <p className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap break-words">{selectedVisitRow.recomendaciones || 'Sin recomendaciones'}</p>
                    </div>

                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Equipo</TableHead>
                            <TableHead>Serial</TableHead>
                            <TableHead>Tareas realizadas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedVisitRow.equipos.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">Sin equipos asociados</TableCell>
                            </TableRow>
                          ) : (
                            selectedVisitRow.equipos.map((equipment) => (
                              <TableRow key={equipment.id}>
                                <TableCell>{equipment.hardware?.name || equipment.hardware_nombre_manual || 'Sin especificar'}</TableCell>
                                <TableCell>{equipment.hardware?.serial_number || '-'}</TableCell>
                                <TableCell className="whitespace-normal break-words">{equipment.tareas_realizadas}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
