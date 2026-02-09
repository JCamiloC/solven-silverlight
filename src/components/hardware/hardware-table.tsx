'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  MoreHorizontal, 
  ArrowUpDown, 
  Search,
  Edit,
  Trash2,
  FileText,
  Download,
  Loader2
} from 'lucide-react'
import { HardwareAsset } from '@/types'
import { HardwareForm } from './hardware-form'
import { useUpdateHardware, useDeleteHardware, useGetFollowUps } from '@/hooks/use-hardware'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { hardwareService } from '@/services/hardware'
import { HardwareLifesheetPDF } from '@/lib/services/hardware-lifesheet-pdf'
import { HardwareDeliveryActaPDF } from '@/lib/services/hardware-delivery-acta-pdf'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import ActasService from '@/services/actas'
import ActaGeneratorModal from '@/components/actas/ActaGeneratorModal'

interface HardwareTableProps {
  data: HardwareAsset[]
  isLoading?: boolean
  clientId?: string  // Added for navigation
  readOnly?: boolean // Hide actions for clients
}

export function HardwareTable({ data, isLoading, clientId, readOnly = false }: HardwareTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [editingAsset, setEditingAsset] = useState<HardwareAsset | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [pdfProgress, setPdfProgress] = useState(0)
  const [pdfProgressText, setPdfProgressText] = useState('')
  const [showActaDialogFor, setShowActaDialogFor] = useState<HardwareAsset | null>(null)
  const [actaLink, setActaLink] = useState<string | null>(null)
  
  const updateMutation = useUpdateHardware()
  const deleteMutation = useDeleteHardware()

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default' as const, label: 'Activo' },
      maintenance: { variant: 'secondary' as const, label: 'Mantenimiento' },
      retired: { variant: 'destructive' as const, label: 'Retirado' },
    }
    
    const config = variants[status as keyof typeof variants] || variants.active
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }

  const columns: ColumnDef<HardwareAsset>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Nombre
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
    },
    {
      accessorKey: 'brand',
      header: 'Marca',
    },
    {
      accessorKey: 'model',
      header: 'Modelo',
    },
    {
      accessorKey: 'serial_number',
      header: 'Número de Serie',
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => getStatusBadge(row.getValue('status')),
    },
    {
      accessorKey: 'persona_responsable',
      header: 'Persona Responsable',
      cell: ({ row }) => {
        const persona = row.getValue('persona_responsable') as string
        return persona || '-'
      },
    },
    {
      id: 'followup_count',
      header: '# Seguimientos',
      cell: ({ row }) => {
        const asset = row.original
        return <FollowupCount hardwareId={asset.id} />
      },
    },
  ]

  // Only add actions column if not in readOnly mode
  if (!readOnly) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const asset = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setEditingAsset(asset)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {clientId && (
                <DropdownMenuItem 
                  onClick={() => router.push(`/dashboard/clientes/${clientId}/hardware/${asset.id}/seguimientos`)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Ver Seguimientos
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => generateLifesheet(asset)}>
                <FileText className="mr-2 h-4 w-4" />
                Generar Hoja de Vida
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadActa(asset)}>
                <Download className="mr-2 h-4 w-4" />
                Descargar Acta
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => handleDelete(asset)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  function FollowupCount({ hardwareId }: { hardwareId: string }) {
    const { data, isLoading } = useGetFollowUps(hardwareId)
    if (isLoading) return <span className="text-sm text-muted-foreground">...</span>
    return <span className="text-sm">{data ? data.length : 0}</span>
  }

  const handleDelete = async (asset: HardwareAsset) => {
    if (confirm(`¿Está seguro de que desea eliminar el equipo "${asset.name}"?`)) {
      deleteMutation.mutate(asset.id)
    }
  }

  const [viewingAsset, setViewingAsset] = useState<HardwareAsset | null>(null)

  const generateLifesheet = async (asset: HardwareAsset) => {
    try {
      setGeneratingPDF(true)
      setPdfProgress(0)
      setPdfProgressText('Iniciando generación...')

      // Simular progreso mientras se cargan los datos
      const progressInterval = setInterval(() => {
        setPdfProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 500)

      // Paso 1: Obtener datos del hardware
      setPdfProgressText('Cargando información del equipo...')
      setPdfProgress(20)
      const hardware = await hardwareService.getById(asset.id)

      if (!hardware) {
        throw new Error('No se pudo obtener la información del hardware')
      }

      // Paso 2: Obtener upgrades
      setPdfProgressText('Cargando historial de actualizaciones...')
      setPdfProgress(40)
      const upgrades = await hardwareService.getUpgrades(asset.id)

      // Paso 3: Obtener seguimientos
      setPdfProgressText('Cargando historial de mantenimientos...')
      setPdfProgress(60)
      const followUps = await hardwareService.getFollowUps(asset.id)

      // Paso 4: Generar PDF
      setPdfProgressText('Generando documento PDF...')
      setPdfProgress(80)
      await HardwareLifesheetPDF.generateLifesheet(hardware, upgrades, followUps)

      clearInterval(progressInterval)
      setPdfProgress(100)
      setPdfProgressText('¡Completado!')

      setTimeout(() => {
        setGeneratingPDF(false)
        setPdfProgress(0)
        toast.success('Hoja de Vida generada exitosamente', {
          description: 'El PDF se ha descargado correctamente.',
        })
      }, 1000)

    } catch (error) {
      console.error('Error generating lifesheet:', error)
      setGeneratingPDF(false)
      setPdfProgress(0)
      toast.error('Error al generar la Hoja de Vida', {
        description: 'No se pudo generar el documento PDF.',
      })
    }
  }

  const downloadActa = async (asset: HardwareAsset) => {
    try {
      setGeneratingPDF(true)
      setPdfProgress(0)
      setPdfProgressText('Generando Acta de Entrega...')

      // Simular progreso
      const progressInterval = setInterval(() => {
        setPdfProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 10
        })
      }, 300)

      // ==========================================
      // FLUJO DE FIRMAS TEMPORALMENTE COMENTADO
      // ==========================================
      // TODO: Reactivar cuando se implemente completamente el sistema de firmas
      /*
      // Buscar acta existente
      setPdfProgress(10)
      const existingActa = await ActasService.getByHardwareAssetId(asset.id)

      // Si existe y está completa, generar PDF con las firmas
      if (existingActa && existingActa.estado_firma === 'completo') {
        setPdfProgress(30)
        const hardware = await hardwareService.getById(asset.id)

        if (!hardware) throw new Error('No se pudo obtener la información del hardware')

        setPdfProgressText('Obteniendo información del cliente...')
        setPdfProgress(50)

        // Obtener información del cliente para mostrar en el PDF
        let empresaCliente = undefined
        if (hardware.client_id) {
          try {
            const { supabase } = await import('@/lib/supabase/client')
            const { data: clientData } = await supabase
              .from('clients')
              .select('name, nit')
              .eq('id', hardware.client_id)
              .single()
            
            if (clientData) {
              empresaCliente = {
                nombre: clientData.name,
                nit: clientData.nit || 'No especificado'
              }
            }
          } catch (error) {
            console.warn('Error obteniendo datos del cliente:', error)
          }
        }

        setPdfProgressText('Generando documento PDF...')
        setPdfProgress(70)

        await HardwareDeliveryActaPDF.generateActa({
          hardware,
          empresaCliente,
          entregadoPor: {
            nombre: existingActa.generador_nombre || 'Silverlight Colombia',
            cargo: 'Técnico de Soporte',
            cedula: existingActa.generador_cedula || undefined,
          },
          recibidoPor: {
            nombre: existingActa.cliente_nombre || hardware.persona_responsable || 'No especificado',
            cedula: existingActa.cliente_cedula || undefined,
          },
          // TEMPORALMENTE COMENTADO - Firmas digitales
          // generadorFirmaUrl: existingActa.generador_firma_url || null,
          // clienteFirmaUrl: existingActa.cliente_firma_url || null,
        })

        clearInterval(progressInterval)
        setPdfProgress(100)
        setPdfProgressText('¡Completado!')

        setTimeout(() => {
          setGeneratingPDF(false)
          setPdfProgress(0)
          toast.success('Acta de Entrega generada', {
            description: 'El PDF se ha descargado correctamente.',
          })
        }, 1000)

        return
      }

      // Si existe acta pero falta la firma del cliente, mostrar dialog con link
      if (existingActa && existingActa.estado_firma !== 'completo') {
        setActaLink(existingActa.link_temporal || null)
        setShowActaDialogFor(asset)
        setGeneratingPDF(false)
        clearInterval(progressInterval)
        return
      }

      // Si no existe acta, abrir modal para capturar firma del generador
      setGeneratingPDF(false)
      setShowActaDialogFor(asset)
      clearInterval(progressInterval)
      */

      // ==========================================
      // GENERACIÓN DIRECTA DE PDF (SIN FIRMAS)
      // ==========================================
      setPdfProgress(30)
      const hardware = await hardwareService.getById(asset.id)

      if (!hardware) throw new Error('No se pudo obtener la información del hardware')

      setPdfProgressText('Obteniendo información del cliente...')
      setPdfProgress(50)

      // Obtener información del cliente para mostrar en el PDF
      let empresaCliente = undefined
      if (hardware.client_id) {
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { data: clientData, error } = await supabase
            .from('clients')
            .select('name, nit')
            .eq('id', hardware.client_id)
            .single()
          
          if (clientData) {
            empresaCliente = {
              nombre: clientData.name,
              nit: clientData.nit || 'No especificado'
            }
          }
        } catch (error) {
          console.warn('Error obteniendo datos del cliente:', error)
        }
      }

      setPdfProgressText('Generando documento PDF...')
      setPdfProgress(70)

      await HardwareDeliveryActaPDF.generateActa({
        hardware,
        empresaCliente,
        entregadoPor: {
          nombre: 'Por definir',
          cargo: 'Técnico de Soporte',
        },
        recibidoPor: {
          nombre: hardware.persona_responsable || undefined,
        },
      })

      clearInterval(progressInterval)
      setPdfProgress(100)
      setPdfProgressText('¡Completado!')

      setTimeout(() => {
        setGeneratingPDF(false)
        setPdfProgress(0)
        toast.success('Acta de Entrega generada', {
          description: 'El PDF se ha descargado correctamente.',
        })
      }, 1000)

    } catch (error) {
      console.error('Error generating acta:', error)
      setGeneratingPDF(false)
      setPdfProgress(0)
      toast.error('Error al generar el Acta', {
        description: (error as Error)?.message || 'No se pudo generar el documento.',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Cargando hardware...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center py-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar hardware..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="pl-8"
          />
        </div>
      </div>
      
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} de{' '}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>

      {/* Edit Hardware Dialog */}
      <Dialog open={!!editingAsset} onOpenChange={(open) => !open && setEditingAsset(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Hardware</DialogTitle>
            <DialogDescription>
              Modifica los datos del equipo de hardware.
            </DialogDescription>
          </DialogHeader>
          {editingAsset && (
            <HardwareForm
              asset={editingAsset}
              clientId={editingAsset?.client_id}
              onSuccess={() => setEditingAsset(null)}
              onCancel={() => setEditingAsset(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Acta Generator Dialog */}
      <Dialog open={!!showActaDialogFor} onOpenChange={(open) => !open && setShowActaDialogFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generar Acta de Entrega</DialogTitle>
            <DialogDescription>
              Completa los datos y firma para generar el link de firma del cliente.
            </DialogDescription>
          </DialogHeader>
          {showActaDialogFor && (
            <div>
              <ActaGeneratorModal
                hardwareAssetId={showActaDialogFor.id}
                onCreated={(link) => {
                  setActaLink(link)
                  setShowActaDialogFor(null)
                  toast.success('Link de firma generado')
                }}
              />

              {actaLink && (
                <div className="mt-4">
                  <p className="text-sm">Link para que el cliente firme:</p>
                  <div className="flex items-center gap-2 mt-2">
                    <input className="flex-1" value={`${window.location.origin}/actas/${actaLink}`} readOnly />
                    <Button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/actas/${actaLink}`)}>Copiar</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Generation Progress Dialog */}
      <Dialog open={generatingPDF} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Generando Hoja de Vida
            </DialogTitle>
            <DialogDescription>
              Por favor espera mientras se genera el documento PDF...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{pdfProgressText}</span>
                <span className="font-medium">{Math.round(pdfProgress)}%</span>
              </div>
              <Progress value={pdfProgress} className="h-2" />
            </div>
            {pdfProgress === 100 && (
              <div className="flex items-center justify-center text-sm text-green-600">
                <FileText className="mr-2 h-4 w-4" />
                PDF descargado exitosamente
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}