'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Wrench,
} from 'lucide-react'

import { useAuth } from '@/hooks/use-auth'
import { useHardwareAssetsByClient } from '@/hooks/use-hardware'
import { useClientVisits, useCreateClientVisit, useUpdateVisitStatus } from '@/hooks/use-visitas'
import { ClientVisit, VisitStatus, VisitType } from '@/types'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ClientSearchCombobox } from '@/components/ui/client-search-combobox'
import { useActionLock } from '@/hooks/use-action-lock'

const OTHER_EQUIPMENT_VALUE = '__other__'

const VISIT_TYPES: Array<{ value: VisitType; label: string }> = [
  { value: 'programada', label: 'Programada' },
  { value: 'no_programada', label: 'No programada' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'soporte', label: 'Soporte en sitio' },
  { value: 'otro', label: 'Otro' },
]

const VISIT_STATUS: Array<{ value: VisitStatus; label: string }> = [
  { value: 'completada', label: 'Completada' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'cancelada', label: 'Cancelada' },
]

const AVAILABLE_ACTIVITIES = [
  'Inspección general',
  'Limpieza de equipos',
  'Mantenimiento preventivo',
  'Mantenimiento correctivo',
  'Diagnóstico de fallas',
  'Ajuste de configuración',
  'Actualización de software',
  'Capacitación al usuario',
]

type EquipmentFormRow = {
  rowId: string
  selectedEquipment: string
  otherEquipmentName: string
  tasks: string
}

interface VisitasViewProps {
  clientId: string
  clientName?: string
  readOnly?: boolean
}

const createEquipmentRow = (): EquipmentFormRow => {
  const rowId = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return {
    rowId,
    selectedEquipment: '',
    otherEquipmentName: '',
    tasks: '',
  }
}

const getVisitTypeLabel = (value: VisitType) => {
  return VISIT_TYPES.find((item) => item.value === value)?.label || value
}

const getStatusLabel = (value: VisitStatus) => {
  return VISIT_STATUS.find((item) => item.value === value)?.label || value
}

const getStatusVariant = (value: VisitStatus): 'default' | 'secondary' | 'outline' | 'destructive' => {
  if (value === 'completada') return 'default'
  if (value === 'pendiente') return 'secondary'
  return 'destructive'
}

const escapeCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return format(date, 'dd/MM/yyyy HH:mm', { locale: es })
}

export function VisitasView({ clientId, clientName, readOnly = false }: VisitasViewProps) {
  const { profile } = useAuth()
  const createVisitMutation = useCreateClientVisit()
  const updateVisitStatusMutation = useUpdateVisitStatus()
  const { runWithLock, isLocked } = useActionLock()
  const { data: hardwareAssets = [], isLoading: loadingHardware } = useHardwareAssetsByClient(clientId)
  const { data: visits = [], isLoading: loadingVisits } = useClientVisits(clientId)

  const [isFormOpen, setIsFormOpen] = useState(true)
  const [selectedVisit, setSelectedVisit] = useState<ClientVisit | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailStatus, setDetailStatus] = useState<VisitStatus>('completada')

  const [visitDate, setVisitDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [visitType, setVisitType] = useState<VisitType | ''>('')
  const [visitStatus, setVisitStatus] = useState<VisitStatus>('completada')
  const [visitDetail, setVisitDetail] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [activities, setActivities] = useState<string[]>([])
  const [equipmentRows, setEquipmentRows] = useState<EquipmentFormRow[]>([createEquipmentRow()])

  const selectedHardwareIds = useMemo(() => {
    return new Set(
      equipmentRows
        .map((row) => row.selectedEquipment)
        .filter((value) => value && value !== OTHER_EQUIPMENT_VALUE)
    )
  }, [equipmentRows])

  const resetForm = () => {
    setVisitDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
    setVisitType('')
    setVisitStatus('completada')
    setVisitDetail('')
    setRecommendations('')
    setActivities([])
    setEquipmentRows([createEquipmentRow()])
  }

  const toggleActivity = (activity: string) => {
    setActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((item) => item !== activity)
        : [...prev, activity]
    )
  }

  const updateEquipmentRow = (rowId: string, updates: Partial<EquipmentFormRow>) => {
    setEquipmentRows((prev) => prev.map((row) => (row.rowId === rowId ? { ...row, ...updates } : row)))
  }

  const addEquipmentRow = () => {
    setEquipmentRows((prev) => [...prev, createEquipmentRow()])
  }

  const removeEquipmentRow = (rowId: string) => {
    setEquipmentRows((prev) => (prev.length > 1 ? prev.filter((row) => row.rowId !== rowId) : prev))
  }

  const handleCreateVisit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!visitType || !visitDetail.trim()) {
      toast.error('Debes completar el tipo y detalle de la visita')
      return
    }

    const normalizedEquipment = equipmentRows
      .map((row) => ({
        selectedEquipment: row.selectedEquipment,
        otherEquipmentName: row.otherEquipmentName.trim(),
        tasks: row.tasks.trim(),
      }))
      .filter((row) => row.selectedEquipment || row.otherEquipmentName || row.tasks)

    if (normalizedEquipment.length === 0) {
      toast.error('Debes registrar al menos un equipo atendido')
      return
    }

    const hasInvalidRows = normalizedEquipment.some((row) => {
      if (!row.tasks) return true
      if (row.selectedEquipment === OTHER_EQUIPMENT_VALUE) {
        return !row.otherEquipmentName
      }
      return !row.selectedEquipment
    })

    if (hasInvalidRows) {
      toast.error('Verifica que cada equipo tenga selección válida y tareas realizadas')
      return
    }

    try {
      await runWithLock(async () => {
        await createVisitMutation.mutateAsync({
          clientId,
          fechaVisita: new Date(visitDate).toISOString(),
          tipo: visitType,
          estado: visitStatus,
          detalle: visitDetail.trim(),
          actividades: activities,
          recomendaciones: recommendations.trim(),
          tecnicoResponsable: profile?.id,
          creadoPor: profile?.id,
          equipos: normalizedEquipment.map((row) =>
            row.selectedEquipment === OTHER_EQUIPMENT_VALUE
              ? {
                  hardwareNombreManual: row.otherEquipmentName,
                  tareasRealizadas: row.tasks,
                }
              : {
                  hardwareId: row.selectedEquipment,
                  tareasRealizadas: row.tasks,
                }
          ),
        })
      }, { message: 'Guardando visita...' })

      resetForm()
    } catch (error) {
      console.error('Error creating visit:', error)
    }
  }

  const openVisitDetail = (visit: ClientVisit) => {
    setSelectedVisit(visit)
    setDetailStatus(visit.estado)
    setIsDetailOpen(true)
  }

  useEffect(() => {
    if (!selectedVisit) return
    setDetailStatus(selectedVisit.estado)
  }, [selectedVisit])

  const handleUpdateVisitStatus = async () => {
    if (!selectedVisit) return
    if (detailStatus === selectedVisit.estado) {
      toast.info('El estado no cambió')
      return
    }

    try {
      const updated = await runWithLock(
        async () =>
          updateVisitStatusMutation.mutateAsync({
            visitId: selectedVisit.id,
            status: detailStatus,
          }),
        { message: 'Actualizando estado de visita...' }
      )

      setSelectedVisit(updated)
    } catch (error) {
      console.error('Error updating visit status:', error)
    }
  }

  const exportCsvReport = () => {
    if (!visits.length) {
      toast.error('No hay visitas para exportar')
      return
    }

    const rows = visits.flatMap((visit) => {
      const technicianName = visit.tecnico
        ? `${visit.tecnico.first_name || ''} ${visit.tecnico.last_name || ''}`.trim() || '-'
        : '-'

      const baseRow = {
        fecha: formatDateTime(visit.fecha_visita),
        tipo: getVisitTypeLabel(visit.tipo),
        estado: getStatusLabel(visit.estado),
        detalle: visit.detalle,
        recomendaciones: visit.recomendaciones || '',
        tecnico: technicianName,
      }

      if (!visit.equipos.length) {
        return [
          {
            ...baseRow,
            equipo: 'Sin equipo asociado',
            serial: '',
            tareas: '',
          },
        ]
      }

      return visit.equipos.map((equipment) => ({
        ...baseRow,
        equipo: equipment.hardware?.name || equipment.hardware_nombre_manual || 'Sin especificar',
        serial: equipment.hardware?.serial_number || '',
        tareas: equipment.tareas_realizadas || '',
      }))
    })

    const headers = [
      'Fecha visita',
      'Tipo',
      'Estado',
      'Equipo',
      'Serial',
      'Tareas realizadas',
      'Técnico',
      'Detalle general de la visita',
      'Recomendaciones',
    ]

    const csvBody = rows
      .map((row) =>
        [
          row.fecha,
          row.tipo,
          row.estado,
          row.equipo,
          row.serial,
          row.tareas,
          row.tecnico,
          row.detalle,
          row.recomendaciones,
        ]
          .map((value) => escapeCsvValue(String(value || '')))
          .join(',')
      )
      .join('\n')

    const csvContent = `\uFEFF${headers.join(',')}\n${csvBody}`

    const fileSafeClient = (clientName || 'cliente')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')

    const filename = `reporte_visitas_${fileSafeClient || 'cliente'}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    toast.success('Reporte de visitas exportado')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Visitas Técnicas {clientName ? `- ${clientName}` : ''}</h2>
          <p className="text-sm text-muted-foreground">
            Control, trazabilidad y reporte de visitas con múltiples equipos atendidos.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={exportCsvReport}
          disabled={loadingVisits || visits.length === 0}
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar reporte CSV
        </Button>
      </div>

      {!readOnly && (
        <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    <CardTitle>Registrar Nueva Visita</CardTitle>
                  </div>
                  {isFormOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                {!isFormOpen && <CardDescription>Click para expandir el formulario</CardDescription>}
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-6">
                <form onSubmit={handleCreateVisit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fecha-visita" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha de visita
                      </Label>
                      <Input
                        id="fecha-visita"
                        type="datetime-local"
                        value={visitDate}
                        onChange={(event) => setVisitDate(event.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de visita *</Label>
                      <Select value={visitType} onValueChange={(value) => setVisitType(value as VisitType)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {VISIT_TYPES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={visitStatus} onValueChange={(value) => setVisitStatus(value as VisitStatus)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {VISIT_STATUS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visit-detail">Detalle general de la visita *</Label>
                    <Textarea
                      id="visit-detail"
                      rows={4}
                      value={visitDetail}
                      onChange={(event) => setVisitDetail(event.target.value)}
                      placeholder="Describe los hallazgos generales, contexto y resultados de la visita"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Actividades generales realizadas
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/50">
                      {AVAILABLE_ACTIVITIES.map((activity) => (
                        <div key={activity} className="flex items-center space-x-2">
                          <Checkbox
                            id={`activity-${activity}`}
                            checked={activities.includes(activity)}
                            onCheckedChange={() => toggleActivity(activity)}
                          />
                          <label htmlFor={`activity-${activity}`} className="text-sm cursor-pointer">
                            {activity}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Label>Equipos atendidos y tareas realizadas *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addEquipmentRow}>
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar equipo
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {equipmentRows.map((row) => {
                        const disabledHardwareIds = new Set(selectedHardwareIds)
                        if (row.selectedEquipment && row.selectedEquipment !== OTHER_EQUIPMENT_VALUE) {
                          disabledHardwareIds.delete(row.selectedEquipment)
                        }

                        return (
                          <Card key={row.rowId}>
                            <CardContent className="pt-4 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label>Equipo</Label>
                                  <ClientSearchCombobox
                                    options={[
                                      ...hardwareAssets.map((asset) => ({
                                        value: asset.id,
                                        label: `${asset.name}${asset.serial_number ? ` • S/N ${asset.serial_number}` : ''}`,
                                        disabled: disabledHardwareIds.has(asset.id),
                                      })),
                                      {
                                        value: OTHER_EQUIPMENT_VALUE,
                                        label: 'Otro equipo (manual)',
                                      },
                                    ]}
                                    value={row.selectedEquipment}
                                    onValueChange={(value) =>
                                      updateEquipmentRow(row.rowId, {
                                        selectedEquipment: value,
                                        otherEquipmentName: value === OTHER_EQUIPMENT_VALUE ? row.otherEquipmentName : '',
                                      })
                                    }
                                    placeholder={loadingHardware ? 'Cargando equipos...' : 'Seleccione equipo atendido'}
                                    searchPlaceholder="Buscar equipo por nombre o serial..."
                                    emptyMessage="No se encontraron equipos"
                                    minSearchChars={1}
                                    disabled={loadingHardware}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Acciones</Label>
                                  <div className="h-10 flex items-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => removeEquipmentRow(row.rowId)}
                                      disabled={equipmentRows.length === 1}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Quitar
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {row.selectedEquipment === OTHER_EQUIPMENT_VALUE && (
                                <div className="space-y-2">
                                  <Label>Nombre del otro equipo</Label>
                                  <Input
                                    value={row.otherEquipmentName}
                                    onChange={(event) =>
                                      updateEquipmentRow(row.rowId, { otherEquipmentName: event.target.value })
                                    }
                                    placeholder="Ej: Impresora recepción, Router principal, etc."
                                  />
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label>Tareas realizadas *</Label>
                                <Textarea
                                  rows={3}
                                  value={row.tasks}
                                  onChange={(event) => updateEquipmentRow(row.rowId, { tasks: event.target.value })}
                                  placeholder="Describe las tareas realizadas para este equipo"
                                  required
                                />
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visit-recommendations">Recomendaciones (opcional)</Label>
                    <Textarea
                      id="visit-recommendations"
                      rows={3}
                      value={recommendations}
                      onChange={(event) => setRecommendations(event.target.value)}
                      placeholder="Recomendaciones para próximas acciones"
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Limpiar
                    </Button>
                    <LoadingButton
                      type="submit"
                      loading={createVisitMutation.isPending || isLocked}
                      loadingText="Guardando visita..."
                    >
                      Guardar visita
                    </LoadingButton>
                  </div>
                </form>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historial de Visitas</CardTitle>
          <CardDescription>
            Cada visita puede incluir varios equipos, manteniendo trazabilidad por tareas realizadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingVisits ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando visitas...</span>
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay visitas registradas para este cliente</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Equipos</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead className="whitespace-nowrap">Técnico</TableHead>
                    <TableHead className="whitespace-nowrap">Detalle</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((visit) => {
                    const equipmentSummary = visit.equipos
                      .slice(0, 2)
                      .map((equipment) => equipment.hardware?.name || equipment.hardware_nombre_manual || 'Sin especificar')
                      .join(', ')

                    const technician = visit.tecnico
                      ? `${visit.tecnico.first_name || ''} ${visit.tecnico.last_name || ''}`.trim() || '-'
                      : '-'

                    return (
                      <TableRow key={visit.id}>
                        <TableCell className="whitespace-nowrap">{formatDateTime(visit.fecha_visita)}</TableCell>
                        <TableCell>{getVisitTypeLabel(visit.tipo)}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="text-sm truncate" title={equipmentSummary}>
                              {equipmentSummary || 'Sin equipos'}
                              {visit.equipos.length > 2 && (
                                <span className="text-muted-foreground"> +{visit.equipos.length - 2} más</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(visit.estado)}>{getStatusLabel(visit.estado)}</Badge>
                        </TableCell>
                        <TableCell>{technician}</TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={visit.detalle}>
                            {visit.detalle}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openVisitDetail(visit)}>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de visita</DialogTitle>
            <DialogDescription>Información completa de la visita y equipos atendidos.</DialogDescription>
          </DialogHeader>

          {selectedVisit && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Fecha</Label>
                  <Input disabled value={formatDateTime(selectedVisit.fecha_visita)} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Input disabled value={getVisitTypeLabel(selectedVisit.tipo)} />
                </div>
                <div>
                  <Label>Estado</Label>
                  {readOnly ? (
                    <Input disabled value={getStatusLabel(selectedVisit.estado)} />
                  ) : (
                    <div className="space-y-2">
                      <Select value={detailStatus} onValueChange={(value) => setDetailStatus(value as VisitStatus)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {VISIT_STATUS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <LoadingButton
                        type="button"
                        size="sm"
                        onClick={handleUpdateVisitStatus}
                        loading={updateVisitStatusMutation.isPending || isLocked}
                        loadingText="Guardando..."
                        disabled={detailStatus === selectedVisit.estado}
                      >
                        Actualizar estado
                      </LoadingButton>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Detalle general</Label>
                <Textarea disabled value={selectedVisit.detalle} rows={4} />
              </div>

              <div className="space-y-2">
                <Label>Actividades generales</Label>
                {selectedVisit.actividades.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin actividades registradas.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedVisit.actividades.map((activity) => (
                      <Badge key={activity} variant="secondary">
                        {activity}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Equipos atendidos</Label>
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
                      {selectedVisit.equipos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No se registraron equipos para esta visita.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedVisit.equipos.map((equipment) => (
                          <TableRow key={equipment.id}>
                            <TableCell>
                              {equipment.hardware?.name || equipment.hardware_nombre_manual || 'Sin especificar'}
                            </TableCell>
                            <TableCell>{equipment.hardware?.serial_number || '-'}</TableCell>
                            <TableCell>{equipment.tareas_realizadas}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Recomendaciones</Label>
                <Textarea disabled value={selectedVisit.recomendaciones || 'Sin recomendaciones registradas.'} rows={3} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
