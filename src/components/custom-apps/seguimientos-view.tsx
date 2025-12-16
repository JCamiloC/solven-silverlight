'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { useCustomAppFollowups, useCreateCustomAppFollowup } from '@/hooks/use-custom-applications'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Upload, X, Calendar, FileText, CheckSquare, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { uploadSeguimientoFoto } from '@/lib/storage'
import { toast } from 'sonner'

const TIPOS_SEGUIMIENTO = [
  { value: 'actualizacion', label: 'Actualización' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'soporte', label: 'Soporte' },
  { value: 'backup', label: 'Backup' },
  { value: 'migracion', label: 'Migración' },
  { value: 'optimizacion', label: 'Optimización' },
  { value: 'bug_fix', label: 'Corrección de Bugs' },
  { value: 'nueva_funcionalidad', label: 'Nueva Funcionalidad' },
  { value: 'otro', label: 'Otro' },
]

const ACTIVIDADES_DISPONIBLES = [
  'Actualización de dependencias',
  'Actualización de framework',
  'Optimización de base de datos',
  'Corrección de errores',
  'Implementación de nueva feature',
  'Mejora de seguridad',
  'Optimización de rendimiento',
  'Backup de base de datos',
  'Migración de servidor',
  'Actualización de certificado SSL',
  'Configuración de CDN',
  'Pruebas de funcionalidad',
  'Deploy a producción',
  'Deploy a staging',
  'Refactorización de código',
  'Documentación técnica',
]

interface SeguimientosViewProps {
  applicationId: string
  applicationName?: string
}

export function SeguimientosView({ applicationId, applicationName }: SeguimientosViewProps) {
  const { profile } = useAuth()
  const createMutation = useCreateCustomAppFollowup()
  const { data: seguimientos, isLoading, refetch } = useCustomAppFollowups(applicationId)

  console.log('SeguimientosView - applicationId:', applicationId)
  console.log('SeguimientosView - seguimientos:', seguimientos)
  console.log('SeguimientosView - isLoading:', isLoading)

  // Form state
  const [fechaRegistro, setFechaRegistro] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [tipo, setTipo] = useState<string>('')
  const [actividades, setActividades] = useState<string[]>([])
  const [detalle, setDetalle] = useState('')
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
    
    if (!tipo || !detalle) {
      toast.error('Por favor complete todos los campos requeridos')
      return
    }

    if (!profile?.id) {
      toast.error('No se pudo identificar el usuario')
      return
    }

    try {
      // Subir foto a Supabase Storage si existe
      let fotoUrl: string | undefined = undefined
      if (foto) {
        toast.loading('Subiendo foto...')
        try {
          fotoUrl = await uploadSeguimientoFoto(foto, applicationId)
          toast.dismiss()
          toast.success('Foto subida exitosamente')
        } catch (error) {
          toast.dismiss()
          toast.error('Error al subir la foto')
          console.error('Error uploading photo:', error)
          return
        }
      }

      await createMutation.mutateAsync({
        application_id: applicationId,
        tipo: tipo as 'actualizacion' | 'mantenimiento' | 'soporte' | 'backup' | 'migracion' | 'optimizacion' | 'bug_fix' | 'nueva_funcionalidad' | 'otro',
        detalle,
        actividades,
        foto_url: fotoUrl,
        fecha_registro: new Date(fechaRegistro).toISOString(),
        tecnico_responsable: profile.id,
      })

      // Reset form
      setTipo('')
      setActividades([])
      setDetalle('')
      setFoto(null)
      setFotoPreview(null)
      setFechaRegistro(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      
      // Refetch seguimientos - forzar recarga inmediata
      setTimeout(() => {
        refetch()
      }, 100)
    } catch (err) {
      console.error('Error creating follow-up', err)
      // El toast de error se maneja en el hook
    }
  }

  const getTipoLabel = (tipo: string) => {
    return TIPOS_SEGUIMIENTO.find(t => t.value === tipo)?.label || tipo
  }

  const getTipoBadgeVariant = (tipo: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (tipo === 'bug_fix' || tipo === 'soporte') return 'destructive'
    if (tipo === 'actualizacion' || tipo === 'nueva_funcionalidad') return 'default'
    if (tipo === 'mantenimiento' || tipo === 'optimizacion') return 'secondary'
    return 'outline'
  }

  const handleViewDetail = (seguimiento: any) => {
    setSelectedSeguimiento(seguimiento)
    setIsDetailModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {applicationName && (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Seguimientos - {applicationName}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Registro y consulta de seguimientos de la aplicación</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/50 max-h-64 overflow-y-auto">
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
                placeholder="Describa en detalle las actividades realizadas, cambios implementados, problemas encontrados, soluciones aplicadas, etc."
                required
              />
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
                  setFoto(null)
                  setFotoPreview(null)
                }}
              >
                Limpiar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar Seguimiento
              </Button>
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
            Consulte todos los seguimientos registrados para esta aplicación
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
              <p>No hay seguimientos registrados para esta aplicación</p>
              <p className="text-xs mt-2">Application ID: {applicationId}</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Actividades</TableHead>
                    <TableHead className="whitespace-nowrap">Detalle</TableHead>
                    <TableHead className="whitespace-nowrap">Técnico</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seguimientos.map((seg: any) => (
                    <TableRow key={seg.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(seg.fecha_registro), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTipoBadgeVariant(seg.tipo)}>
                          {getTipoLabel(seg.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {seg.actividades && seg.actividades.length > 0 ? (
                          <div className="max-w-xs">
                            <div className="text-sm">
                              {seg.actividades.slice(0, 2).join(', ')}
                              {seg.actividades.length > 2 && (
                                <span className="text-muted-foreground">
                                  {' '}+{seg.actividades.length - 2} más
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={seg.detalle}>
                          {seg.detalle}
                        </div>
                      </TableCell>
                      <TableCell>
                        {seg.tecnico
                          ? `${seg.tecnico.first_name || ''} ${seg.tecnico.last_name || ''}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(seg)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/50 max-h-64 overflow-y-auto">
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

              {/* Técnico Responsable */}
              <div className="space-y-2">
                <Label>Técnico Responsable</Label>
                <Input
                  type="text"
                  value={
                    selectedSeguimiento.tecnico
                      ? `${selectedSeguimiento.tecnico.first_name || ''} ${selectedSeguimiento.tecnico.last_name || ''}`.trim()
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
