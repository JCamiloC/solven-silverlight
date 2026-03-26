'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useGetFollowUps, useCreateFollowUp } from '@/hooks/use-hardware'
import { useTickets } from '@/hooks/use-tickets'
import { useAllClientVisits } from '@/hooks/use-visitas'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Upload, X, Calendar, FileText, CheckSquare, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { uploadSeguimientoFoto } from '@/lib/storage'
import { toast } from 'sonner'
import { useActionLock } from '@/hooks/use-action-lock'

const TIPOS_SEGUIMIENTO = [
  { value: 'mantenimiento_programado', label: 'Mantenimiento programado' },
  { value: 'mantenimiento_no_programado', label: 'Mantenimiento no programado' },
  { value: 'soporte_remoto', label: 'Soporte remoto' },
  { value: 'soporte_en_sitio', label: 'Soporte en sitio' },
]

const ACTIVIDADES_DISPONIBLES = [
  'Limpieza de activo tecnol�gico',
  'Actualización de sistema operativo',
  'Instalación de software',
  'Configuración de red',
  'Respaldo de información',
  'Optimización de rendimiento',
  'Resolución de incidentes',
  'Capacitación al usuario',
  'Cambio de componentes',
  'Verificación de seguridad',
]

const TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'Abierto',
  pendiente_confirmacion: 'Pendiente confirmación',
  solucionado: 'Solucionado',
  resolved: 'Solucionado',
  closed: 'Solucionado',
}

const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
}

const VISITA_TIPO_LABELS: Record<string, string> = {
  programada: 'Programada',
  no_programada: 'No programada',
  diagnostico: 'Diagnóstico',
  mantenimiento: 'Mantenimiento',
  soporte: 'Soporte',
  otro: 'Otro',
}

const VISITA_ESTADO_LABELS: Record<string, string> = {
  completada: 'Completada',
  pendiente: 'Pendiente',
  cancelada: 'Cancelada',
}

interface SeguimientosViewProps {
  hardwareId: string
  hardwareName?: string
}

export function SeguimientosView({ hardwareId, hardwareName }: SeguimientosViewProps) {
  const { profile } = useAuth()
  const createMutation = useCreateFollowUp()
  const { runWithLock, isLocked } = useActionLock()
  const { data: seguimientos, isLoading, refetch } = useGetFollowUps(hardwareId)
  const { data: tickets = [], isLoading: loadingTickets } = useTickets()
  const { data: allVisits = [], isLoading: loadingVisits } = useAllClientVisits()

  const relatedTickets = useMemo(() => {
    return tickets
      .filter((ticket) => ticket.hardware_id === hardwareId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [tickets, hardwareId])

  const relatedVisits = useMemo(() => {
    return allVisits
      .filter((visit) =>
        (visit.equipos || []).some((equipo) => equipo.hardware_id === hardwareId)
      )
      .sort((a, b) => new Date(b.fecha_visita).getTime() - new Date(a.fecha_visita).getTime())
  }, [allVisits, hardwareId])

  // Form state
  const [fechaRegistro, setFechaRegistro] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [tipo, setTipo] = useState<string>('')
  const [actividades, setActividades] = useState<string[]>([])
  const [detalle, setDetalle] = useState('')
  const [accionRecomendada, setAccionRecomendada] = useState('')
  const [accionRecomendadaEstado, setAccionRecomendadaEstado] = useState<'realizado' | 'no_realizado'>('no_realizado')
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  // UI state
  const [isFormOpen, setIsFormOpen] = useState(true)
  const [selectedSeguimiento, setSelectedSeguimiento] = useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const handleActividadToggle = (actividad: string) => {
    setActividades(prev =>
      prev.includes(actividad)
        ? prev.filter(a => a !== actividad)
        : [...prev, actividad]
    )
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveFoto = () => {
    setFoto(null)
    setFotoPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tipo || !detalle || !accionRecomendada) {
      toast.error('Por favor complete todos los campos requeridos')
      return
    }

    try {
      // Subir foto a Supabase Storage si existe
      let fotoUrl: string | undefined = undefined
      if (foto) {
        toast.loading('Subiendo foto...')
        try {
          fotoUrl = await uploadSeguimientoFoto(foto, hardwareId)
          toast.dismiss()
          toast.success('Foto subida exitosamente')
        } catch (error) {
          toast.dismiss()
          toast.error('Error al subir la foto')
          console.error('Error uploading photo:', error)
          return
        }
      }

      await runWithLock(async () => {
        await createMutation.mutateAsync({
          hardwareId,
          payload: {
            tipo,
            detalle,
            accion_recomendada: accionRecomendada,
            accion_recomendada_estado: accionRecomendadaEstado,
            actividades,
            foto_url: fotoUrl,
            fecha_registro: new Date(fechaRegistro).toISOString(),
            creado_por: profile?.id,
          },
        })
      }, { message: 'Guardando seguimiento...' })

      // Reset form
      setTipo('')
      setActividades([])
      setDetalle('')
      setAccionRecomendada('')
      setAccionRecomendadaEstado('no_realizado')
      setFoto(null)
      setFotoPreview(null)
      setFechaRegistro(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      
      // Refetch seguimientos
      refetch()
    } catch (err) {
      console.error('Error creating follow-up', err)
      toast.error('Error al guardar el seguimiento')
    }
  }

  const getTipoLabel = (tipo: string) => {
    return TIPOS_SEGUIMIENTO.find(t => t.value === tipo)?.label || tipo
  }

  const getTipoBadgeVariant = (tipo: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (tipo.includes('programado')) return 'default'
    if (tipo.includes('no_programado')) return 'destructive'
    if (tipo.includes('remoto')) return 'secondary'
    return 'outline'
  }

  const getAccionEstadoLabel = (estado?: string) => {
    return estado === 'realizado' ? 'Realizado' : 'No realizado'
  }

  const getAccionEstadoVariant = (estado?: string): 'default' | 'secondary' => {
    return estado === 'realizado' ? 'default' : 'secondary'
  }

  const getTicketStatusVariant = (status?: string): 'default' | 'secondary' | 'outline' => {
    if (status === 'open' || status === 'in_progress') return 'secondary'
    if (status === 'pendiente_confirmacion') return 'outline'
    return 'default'
  }

  const getTicketPriorityVariant = (priority?: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (priority === 'critical') return 'destructive'
    if (priority === 'high') return 'default'
    if (priority === 'medium') return 'secondary'
    return 'outline'
  }

  const getVisitaEstadoVariant = (estado?: string): 'default' | 'secondary' | 'destructive' => {
    if (estado === 'completada') return 'default'
    if (estado === 'cancelada') return 'destructive'
    return 'secondary'
  }

  const truncateText = (text: string | undefined, max = 70) => {
    if (!text) return '-'
    return text.length > max ? `${text.slice(0, max)}...` : text
  }

  const getActividadesResumen = (items: string[] | undefined) => {
    if (!items || items.length === 0) return '-'
    const first = truncateText(items[0], 40)
    if (items.length === 1) return first
    return `${first} (+${items.length - 1})`
  }

  const handleViewDetail = (seguimiento: any) => {
    setSelectedSeguimiento(seguimiento)
    setIsDetailModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {hardwareName && (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Seguimientos - {hardwareName}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Registro y consulta de seguimientos del activo tecnológico</p>
        </div>
      )}

      {/* Card Collapsible: Registrar Nuevo Seguimiento */}
      <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle>Registrar Nuevo Seguimiento</CardTitle>
                </div>
                {isFormOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              {!isFormOpen && (
                <CardDescription>
                  Click para expandir el formulario
                </CardDescription>
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fecha de Registro */}
            <div className="space-y-2">
              <Label htmlFor="fecha" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Registro
              </Label>
              <Input
                id="fecha"
                type="datetime-local"
                value={fechaRegistro}
                onChange={(e) => setFechaRegistro(e.target.value)}
                required
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Seguimiento *</Label>
              <Select value={tipo} onValueChange={setTipo} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el tipo de seguimiento" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_SEGUIMIENTO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actividades */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Actividades Realizadas
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/50">
                {ACTIVIDADES_DISPONIBLES.map((actividad) => (
                  <div key={actividad} className="flex items-center space-x-2">
                    <Checkbox
                      id={actividad}
                      checked={actividades.includes(actividad)}
                      onCheckedChange={() => handleActividadToggle(actividad)}
                    />
                    <label
                      htmlFor={actividad}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {actividad}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Detalle */}
            <div className="space-y-2">
              <Label htmlFor="detalle">Detalle del Seguimiento *</Label>
              <Textarea
                id="detalle"
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                rows={4}
                placeholder="Describa en detalle las actividades realizadas, problemas encontrados, soluciones aplicadas, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accion-recomendada">Acción recomendada *</Label>
              <Textarea
                id="accion-recomendada"
                value={accionRecomendada}
                onChange={(e) => setAccionRecomendada(e.target.value)}
                rows={3}
                placeholder="Indique la acción sugerida posterior al mantenimiento"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accion-recomendada-estado">Estado de la acción recomendada *</Label>
              <Select
                value={accionRecomendadaEstado}
                onValueChange={(value) => setAccionRecomendadaEstado(value as 'realizado' | 'no_realizado')}
              >
                <SelectTrigger id="accion-recomendada-estado">
                  <SelectValue placeholder="Seleccione estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_realizado">No realizado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Foto/Archivo */}
            <div className="space-y-2">
              <Label htmlFor="foto" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Foto o Archivo Adjunto (Opcional)
              </Label>
              {!fotoPreview ? (
                <div className="flex items-center gap-2">
                  <Input
                    id="foto"
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="cursor-pointer"
                  />
                </div>
              ) : (
                <div className="relative inline-block">
                  <img
                    src={fotoPreview}
                    alt="Preview"
                    className="max-w-xs rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveFoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTipo('')
                  setActividades([])
                  setDetalle('')
                  setAccionRecomendada('')
                  setAccionRecomendadaEstado('no_realizado')
                  setFoto(null)
                  setFotoPreview(null)
                }}
              >
                Limpiar
              </Button>
              <LoadingButton
                type="submit"
                loading={createMutation.isPending || isLocked}
                loadingText="Guardando seguimiento..."
              >
                Guardar Seguimiento
              </LoadingButton>
            </div>
          </form>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Card: Historial de Seguimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Seguimientos</CardTitle>
          <CardDescription>
            Consulte todos los seguimientos registrados para este activo tecnológico
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando seguimientos...</span>
            </div>
          ) : !seguimientos || seguimientos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay seguimientos registrados para este activo tecnológico</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[980px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap w-[150px]">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap w-[170px]">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap w-[220px]">Técnico asignado</TableHead>
                    <TableHead className="whitespace-nowrap">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seguimientos.map((seg: any) => (
                    <TableRow key={seg.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(seg.fecha_registro), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge
                          variant={getTipoBadgeVariant(seg.tipo)}
                          className="max-w-[160px] h-auto whitespace-normal break-words text-center leading-tight"
                          title={getTipoLabel(seg.tipo)}
                        >
                          {getTipoLabel(seg.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className="max-w-[210px] truncate"
                          title={
                            seg.creator
                              ? `${seg.creator.first_name || ''} ${seg.creator.last_name || ''}`.trim()
                              : 'Sin asignar'
                          }
                        >
                          {seg.creator
                            ? `${seg.creator.first_name || ''} ${seg.creator.last_name || ''}`.trim()
                            : 'Sin asignar'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[560px] truncate" title={seg.detalle || ''}>
                          {truncateText(seg.detalle, 220)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial Relacionado del Activo Tecnológico</CardTitle>
          <CardDescription>
            Tickets y visitas donde este activo tecnológico está asociado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Tickets asociados</h3>
              <Badge variant="outline">{relatedTickets.length}</Badge>
            </div>

            {loadingTickets ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cargando tickets relacionados...
              </div>
            ) : relatedTickets.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No hay tickets asociados a este activo tecnológico.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[980px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px] whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="w-[200px] whitespace-nowrap">Ticket</TableHead>
                      <TableHead className="w-[180px] whitespace-nowrap">Estado</TableHead>
                      <TableHead className="w-[130px] whitespace-nowrap">Prioridad</TableHead>
                      <TableHead>Asunto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatedTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {ticket.ticket_number || ticket.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTicketStatusVariant(ticket.status)}>
                            {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTicketPriorityVariant(ticket.priority)}>
                            {TICKET_PRIORITY_LABELS[ticket.priority] || ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[360px] truncate" title={ticket.title || ''}>
                            {ticket.title || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Visitas asociadas</h3>
              <Badge variant="outline">{relatedVisits.length}</Badge>
            </div>

            {loadingVisits ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cargando visitas relacionadas...
              </div>
            ) : relatedVisits.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No hay visitas asociadas a este activo tecnológico.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[980px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px] whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="w-[180px] whitespace-nowrap">Tipo</TableHead>
                      <TableHead className="w-[160px] whitespace-nowrap">Estado</TableHead>
                      <TableHead className="w-[220px] whitespace-nowrap">Técnico asignado</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatedVisits.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(visit.fecha_visita), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {VISITA_TIPO_LABELS[visit.tipo] || visit.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getVisitaEstadoVariant(visit.estado)}>
                            {VISITA_ESTADO_LABELS[visit.estado] || visit.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div
                            className="max-w-[210px] truncate"
                            title={
                              visit.tecnico
                                ? `${visit.tecnico.first_name || ''} ${visit.tecnico.last_name || ''}`.trim()
                                : 'Sin asignar'
                            }
                          >
                            {visit.tecnico
                              ? `${visit.tecnico.first_name || ''} ${visit.tecnico.last_name || ''}`.trim()
                              : 'Sin asignar'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[360px] truncate" title={visit.detalle || ''}>
                            {visit.detalle || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal: Ver Detalle del Seguimiento */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalle del Seguimiento
            </DialogTitle>
            <DialogDescription>
              Información completa del seguimiento registrado
            </DialogDescription>
          </DialogHeader>

          {selectedSeguimiento && (
            <div className="space-y-6">
              {/* Fecha de Registro */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Registro
                </Label>
                <Input
                  type="text"
                  value={format(new Date(selectedSeguimiento.fecha_registro), 'dd/MM/yyyy HH:mm', { locale: es })}
                  disabled
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo de Seguimiento</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={getTipoBadgeVariant(selectedSeguimiento.tipo)} className="text-base px-4 py-2">
                    {getTipoLabel(selectedSeguimiento.tipo)}
                  </Badge>
                </div>
              </div>

              {/* Actividades */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Actividades Realizadas
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/50">
                  {ACTIVIDADES_DISPONIBLES.map((actividad) => (
                    <div key={actividad} className="flex items-center space-x-2">
                      <Checkbox
                        id={`detail-${actividad}`}
                        checked={selectedSeguimiento.actividades?.includes(actividad) || false}
                        disabled
                      />
                      <label
                        htmlFor={`detail-${actividad}`}
                        className="text-sm font-medium leading-none"
                      >
                        {actividad}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detalle */}
              <div className="space-y-2">
                <Label>Detalle del Seguimiento</Label>
                <Textarea
                  value={selectedSeguimiento.detalle}
                  rows={6}
                  disabled
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Acción recomendada</Label>
                <Textarea
                  value={selectedSeguimiento.accion_recomendada || 'No registrada'}
                  rows={4}
                  disabled
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Estado de la acción recomendada</Label>
                <div>
                  <Badge variant={getAccionEstadoVariant(selectedSeguimiento.accion_recomendada_estado)}>
                    {getAccionEstadoLabel(selectedSeguimiento.accion_recomendada_estado)}
                  </Badge>
                </div>
              </div>

              {/* Foto */}
              {selectedSeguimiento.foto_url && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Foto Adjunta
                  </Label>
                  <div className="border rounded-lg p-2">
                    <img
                      src={selectedSeguimiento.foto_url}
                      alt="Foto del seguimiento"
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                </div>
              )}

              {/* Creado por */}
              <div className="space-y-2">
                <Label>Creado por</Label>
                <Input
                  type="text"
                  value={
                    selectedSeguimiento.creator
                      ? `${selectedSeguimiento.creator.first_name || ''} ${selectedSeguimiento.creator.last_name || ''}`.trim()
                      : 'No disponible'
                  }
                  disabled
                />
              </div>

              {/* Botón Cerrar */}
              <div className="flex justify-end">
                <Button onClick={() => setIsDetailModalOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
