'use client'

import { useMemo, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, FileText } from 'lucide-react'
import { useClients } from '@/hooks/use-clients'
import { useMaintenanceReport, useExportMaintenanceWord } from '@/hooks/use-maintenance-reports'
import { useTickets } from '@/hooks/use-tickets'
import { useAllClientVisits } from '@/hooks/use-visitas'
import { useAssignableUsers } from '@/hooks/use-users'
import { MaintenanceReportFilters } from '@/types'
import { TicketReportPDF } from '@/lib/services/ticket-report-pdf'
import { TicketReportWord } from '@/lib/services/ticket-report-word'
import { VisitReportPDF, VisitReportRow } from '@/lib/services/visit-report-pdf'
import { VisitReportWord } from '@/lib/services/visit-report-word'
import type { TicketWithRelations } from '@/lib/services/tickets'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

type ReportType = 'mantenimiento' | 'tickets' | 'visitas' | null

interface SharedReportFilters {
  clientId: string
  startDate: string
  endDate: string
}

const categoryLabels: Record<string, string> = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Red',
  access: 'Accesos',
  other: 'Otro',
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
  const currentDate = new Date()
  const pad = (value: number) => value.toString().padStart(2, '0')
  const defaultEndDate = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`
  const defaultStartDate = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-01`

  const [selectedReport, setSelectedReport] = useState<ReportType>(null)
  const [isExportingTickets, setIsExportingTickets] = useState(false)
  const [isExportingVisits, setIsExportingVisits] = useState(false)

  const [filters, setFilters] = useState<SharedReportFilters>({
    clientId: 'all',
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  })

  const [shouldFetchMaintenance, setShouldFetchMaintenance] = useState(false)
  const [shouldFetchTickets, setShouldFetchTickets] = useState(false)
  const [shouldFetchVisits, setShouldFetchVisits] = useState(false)

  const { data: clients } = useClients()
  const { data: tickets = [], isLoading: ticketsLoading } = useTickets()
  const { data: visits = [], isLoading: visitsLoading } = useAllClientVisits()
  const { data: assignableUsers = [] } = useAssignableUsers()

  const maintenanceFilters: MaintenanceReportFilters = {
    reportType: 'hardware',
    clientId: filters.clientId === 'all' ? '' : filters.clientId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  }

  const {
    data: maintenanceRows,
    isLoading: maintenanceLoading,
    isFetching: maintenanceFetching,
  } = useMaintenanceReport(maintenanceFilters, shouldFetchMaintenance)

  const exportWord = useExportMaintenanceWord()

  const selectedClient = clients?.find((c) => c.id === filters.clientId)

  const ticketRows = useMemo(() => {
    if (!shouldFetchTickets) return [] as TicketWithRelations[]

    return tickets.filter((ticket) => {
      const byClient = filters.clientId === 'all' || ticket.client_id === filters.clientId
      const byDate = inDateRange(ticket.created_at, filters.startDate, filters.endDate)
      return byClient && byDate
    })
  }, [tickets, filters, shouldFetchTickets])

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

  const getAssignedUserName = (assignedTo?: string) => {
    if (!assignedTo) return 'Sin asignar'
    const assignedUser = assignableUsers.find((user) => user.id === assignedTo)
    if (!assignedUser) return 'Sin asignar'
    return `${assignedUser.first_name} ${assignedUser.last_name}`.trim()
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenanceRows.map((row) => (
                          <TableRow key={row.rowNumber}>
                            <TableCell className="font-medium">{row.rowNumber}</TableCell>
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
                            <TableCell className="max-w-[300px] truncate" title={row.detalleSeguimiento}>
                              {row.detalleSeguimiento}
                            </TableCell>
                            <TableCell className="max-w-[320px] truncate" title={row.accionRecomendada}>
                              {row.accionRecomendada}
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
                          <TableHead>Categoría</TableHead>
                          <TableHead>Prioridad</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Responsable</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ticketRows.map((ticket) => {
                          const clientName = clients?.find((client) => client.id === ticket.client_id)?.name || 'N/A'

                          return (
                            <TableRow key={ticket.id}>
                              <TableCell>{ticket.ticket_number || `#${ticket.id.slice(-8)}`}</TableCell>
                              <TableCell>{clientName}</TableCell>
                              <TableCell className="max-w-[280px] truncate" title={ticket.title}>
                                {ticket.title}
                              </TableCell>
                              <TableCell>{categoryLabels[ticket.category] || ticket.category}</TableCell>
                              <TableCell>{priorityLabels[ticket.priority] || ticket.priority}</TableCell>
                              <TableCell>{statusLabels[ticket.status as string] || ticket.status}</TableCell>
                              <TableCell>{getAssignedUserName(ticket.assigned_to)}</TableCell>
                              <TableCell>{new Date(ticket.created_at).toLocaleDateString('es-CO')}</TableCell>
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
                              <TableCell className="max-w-[260px] truncate" title={equipments}>
                                {equipments}
                              </TableCell>
                              <TableCell className="max-w-[260px] truncate" title={visit.detalle}>
                                {visit.detalle}
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
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
