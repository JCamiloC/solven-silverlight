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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Mail,
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
import { useAuth } from '@/hooks/use-auth'

interface HardwareTableProps {
  data: HardwareAsset[]
  isLoading?: boolean
  clientId?: string  // Added for navigation
  readOnly?: boolean // Hide actions for clients
}

export function HardwareTable({ data, isLoading, clientId, readOnly = false }: HardwareTableProps) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [editingAsset, setEditingAsset] = useState<HardwareAsset | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [pdfProgress, setPdfProgress] = useState(0)
  const [pdfProgressText, setPdfProgressText] = useState('')
  const [pdfType, setPdfType] = useState<'lifesheet' | 'acta'>('lifesheet')
  
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
      header: 'NÃºmero de Serie',
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

  // Show actions also in readOnly client view, but hide edit/delete there
  if (!readOnly || !!clientId) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const asset = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menÃº</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              {!readOnly && (
                <DropdownMenuItem onClick={() => setEditingAsset(asset)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
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
              <DropdownMenuItem onClick={() => sendActaByEmail(asset)}>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Acta
              </DropdownMenuItem>
              {!readOnly && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => handleDelete(asset)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
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
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const typeFilterValue = (table.getColumn('type')?.getFilterValue() as string) || 'all'
  const statusFilterValue = (table.getColumn('status')?.getFilterValue() as string) || 'all'
  const typeOptions = Array.from(new Set((data || []).map((asset) => asset.type).filter(Boolean))).sort()

  function FollowupCount({ hardwareId }: { hardwareId: string }) {
    const { data, isLoading } = useGetFollowUps(hardwareId)
    if (isLoading) return <span className="text-sm text-muted-foreground">...</span>
    return <span className="text-sm">{data ? data.length : 0}</span>
  }

  const handleDelete = async (asset: HardwareAsset) => {
    if (confirm(`Â¿EstÃ¡ seguro de que desea eliminar el activo tecnológico "${asset.name}"?`)) {
      deleteMutation.mutate(asset.id)
    }
  }

  const [viewingAsset, setViewingAsset] = useState<HardwareAsset | null>(null)

  const generateLifesheet = async (asset: HardwareAsset) => {
    try {
      setPdfType('lifesheet')
      setGeneratingPDF(true)
      setPdfProgress(0)
      setPdfProgressText('Iniciando generaciÃ³n...')

      // Simular progreso mientras se cargan los datos
      const progressInterval = setInterval(() => {
        setPdfProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 500)

      // Paso 1: Obtener datos del hardware
      setPdfProgressText('Cargando informaciÃ³n del activo tecnológico...')
      setPdfProgress(20)
      const hardware = await hardwareService.getById(asset.id)

      if (!hardware) {
        throw new Error('No se pudo obtener la informaciÃ³n del hardware')
      }

      // Paso 2: Obtener upgrades
      setPdfProgressText('Cargando historial de actualizaciones...')
      setPdfProgress(40)
      const upgrades = await hardwareService.getUpgrades(asset.id)

      // Paso 3: Obtener seguimientos
      setPdfProgressText('Cargando historial de mantenimientos...')
      setPdfProgress(60)
      const followUps = await hardwareService.getFollowUps(asset.id)

      // Paso 4: Obtener tickets asociados
      setPdfProgressText('Cargando tickets asociados...')
      setPdfProgress(75)
      const tickets = await hardwareService.getAssociatedTickets(asset.id)

      // Paso 5: Generar PDF
      setPdfProgressText('Generando documento PDF...')
      setPdfProgress(90)
      await HardwareLifesheetPDF.generateLifesheet(hardware, upgrades, followUps, tickets)

      clearInterval(progressInterval)
      setPdfProgress(100)
      setPdfProgressText('Â¡Completado!')

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

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result
        if (typeof result !== 'string') {
          reject(new Error('No se pudo serializar el PDF'))
          return
        }

        const base64 = result.split(',')[1]
        if (!base64) {
          reject(new Error('No se pudo serializar el PDF'))
          return
        }

        resolve(base64)
      }
      reader.onerror = () => reject(new Error('No se pudo serializar el PDF'))
      reader.readAsDataURL(blob)
    })
  }

  const sendActaByEmail = async (asset: HardwareAsset) => {
    let progressInterval: ReturnType<typeof setInterval> | null = null

    try {
      const senderEmail = (user?.email || profile?.email || '').trim()
      if (!senderEmail) {
        throw new Error('No se pudo identificar tu correo de usuario para el envÃ­o')
      }

      setPdfType('acta')
      setGeneratingPDF(true)
      setPdfProgress(0)
      setPdfProgressText('Preparando acta para envÃ­o...')

      progressInterval = setInterval(() => {
        setPdfProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 10
        })
      }, 350)

      setPdfProgress(20)
      const hardware = await hardwareService.getById(asset.id)
      if (!hardware) throw new Error('No se pudo obtener la informaciÃ³n del hardware')

      if (!hardware.correo_responsable) {
        throw new Error('El activo tecnológico no tiene correo del responsable configurado')
      }

      setPdfProgressText('Buscando acta firmada...')
      setPdfProgress(35)
      const existingActa = await ActasService.getByHardwareAssetId(asset.id)

      if (!existingActa || existingActa.estado_firma !== 'completo') {
        throw new Error('El acta aÃºn no estÃ¡ firmada por el receptor. Primero completa la firma para poder enviarla.')
      }

      setPdfProgressText('Obteniendo informaciÃ³n del cliente...')
      setPdfProgress(50)

      let empresaCliente = undefined
      if (hardware.client_id) {
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { data: clientData } = await supabase
            .from('clients')
            .select('name, nit')
            .eq('id', hardware.client_id)
            .single()

          if (clientData) {
            empresaCliente = {
              nombre: clientData.name,
              nit: clientData.nit || 'No especificado',
            }
          }
        } catch (error) {
          console.warn('Error obteniendo datos del cliente:', error)
        }
      }

      const mainRecipient = hardware.correo_responsable.trim().toLowerCase()
      const senderNormalized = senderEmail.toLowerCase()
      const bccRecipients = senderNormalized !== mainRecipient ? [senderNormalized] : []

      const confirmMessage = [
        'Â¿Deseas enviar el acta por correo?',
        '',
        `Para: ${mainRecipient}`,
        `CCO: ${bccRecipients.length ? bccRecipients.join(', ') : 'Sin copia adicional'}`,
      ].join('\n')

      const confirmSend = window.confirm(confirmMessage)

      if (!confirmSend) {
        setGeneratingPDF(false)
        setPdfProgress(0)
        return
      }

      setPdfProgressText('Generando PDF del acta...')
      setPdfProgress(65)

      const pdfBlob = await HardwareDeliveryActaPDF.generateActaBlob({
        hardware,
        empresaCliente,
        entregadoPor: {
          nombre: existingActa.generador_nombre || 'Silverlight Colombia',
          cargo: 'TÃ©cnico de Soporte',
          cedula: existingActa.generador_cedula || undefined,
        },
        recibidoPor: {
          nombre: existingActa.cliente_nombre || hardware.persona_responsable || 'No especificado',
          cedula: existingActa.cliente_cedula || undefined,
        },
        generadorFirmaUrl: existingActa.generador_firma_url || null,
        clienteFirmaUrl: existingActa.cliente_firma_url || null,
      })

      const pdfBase64 = await blobToBase64(pdfBlob)

      setPdfProgressText('Enviando acta por correo...')
      setPdfProgress(85)

      const fileName = `ActaEntrega_${(hardware.name || 'Activo tecnológico').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`

      const mailRes = await fetch('/api/actas/send-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [mainRecipient],
          bcc: bccRecipients,
          pdfBase64,
          fileName,
          hardwareName: hardware.name,
          clientName: empresaCliente?.nombre,
          recipientName: hardware.persona_responsable || undefined,
        }),
      })

      if (!mailRes.ok) {
        const payload = await mailRes.json().catch(() => ({}))
        throw new Error(payload?.error || 'No se pudo enviar el acta por correo')
      }

      setPdfProgress(100)
      setPdfProgressText('Â¡Acta enviada!')

      setTimeout(() => {
        setGeneratingPDF(false)
        setPdfProgress(0)
        toast.success('Acta enviada por correo', {
          description: bccRecipients.length
            ? `Se enviÃ³ al responsable y te llegÃ³ copia oculta a ${senderEmail}.`
            : 'Se enviÃ³ correctamente al responsable.',
        })
      }, 700)
    } catch (error) {
      console.error('Error sending acta by email:', error)
      setGeneratingPDF(false)
      setPdfProgress(0)
      toast.error('Error al enviar el Acta', {
        description: (error as Error)?.message || 'No se pudo enviar el correo.',
      })
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }

  const downloadActa = async (asset: HardwareAsset) => {
    try {
      setPdfType('acta')
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

      setPdfProgress(20)
      const hardware = await hardwareService.getById(asset.id)

      if (!hardware) throw new Error('No se pudo obtener la informaciÃ³n del hardware')

      // Buscar acta existente
      setPdfProgress(35)
      const existingActa = await ActasService.getByHardwareAssetId(asset.id)

      setPdfProgressText('Obteniendo informaciÃ³n del cliente...')
      setPdfProgress(45)

      let empresaCliente = undefined
      let firmaEmpresa: { nombre?: string; cedula?: string; firmaUrl?: string } = {}
      if (hardware.client_id) {
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { data: clientData } = await supabase
            .from('clients')
            .select('name, nit, acta_generador_nombre, acta_generador_cedula, acta_generador_firma_url')
            .eq('id', hardware.client_id)
            .single()

          if (clientData) {
            empresaCliente = {
              nombre: clientData.name,
              nit: clientData.nit || 'No especificado',
            }
            firmaEmpresa = {
              nombre: clientData.acta_generador_nombre || undefined,
              cedula: clientData.acta_generador_cedula || undefined,
              firmaUrl: clientData.acta_generador_firma_url || undefined,
            }
          }
        } catch (error) {
          console.warn('Error obteniendo datos del cliente:', error)
        }
      }

      const firmaEmpresaCompleta = Boolean(
        firmaEmpresa.nombre && firmaEmpresa.cedula && firmaEmpresa.firmaUrl
      )

      if (!firmaEmpresaCompleta) {
        throw new Error('Debes registrar primero la firma de la empresa en Datos BÃ¡sicos del cliente')
      }

      // Si existe y estÃ¡ completa, generar PDF con las firmas
      if (existingActa && existingActa.estado_firma === 'completo') {
        setPdfProgressText('Generando documento PDF...')
        setPdfProgress(70)

        await HardwareDeliveryActaPDF.generateActa({
          hardware,
          empresaCliente,
          entregadoPor: {
            nombre: existingActa.generador_nombre || 'Silverlight Colombia',
            cargo: 'TÃ©cnico de Soporte',
            cedula: existingActa.generador_cedula || undefined,
          },
          recibidoPor: {
            nombre: existingActa.cliente_nombre || hardware.persona_responsable || 'No especificado',
            cedula: existingActa.cliente_cedula || undefined,
          },
          generadorFirmaUrl: existingActa.generador_firma_url || null,
          clienteFirmaUrl: existingActa.cliente_firma_url || null,
        })

        clearInterval(progressInterval)
        setPdfProgress(100)
        setPdfProgressText('Â¡Completado!')

        setTimeout(() => {
          setGeneratingPDF(false)
          setPdfProgress(0)
          toast.success('Acta de Entrega generada', {
            description: 'El PDF se ha descargado correctamente.',
          })
        }, 1000)

        return
      }

      if (!hardware.correo_responsable) {
        throw new Error('El activo tecnológico no tiene correo del responsable para enviar el link de firma')
      }

      const confirmSend = window.confirm(
        'Â¿EstÃ¡ seguro de enviar por correo el link de firma a quien recibe el hardware?'
      )

      if (!confirmSend) {
        setGeneratingPDF(false)
        clearInterval(progressInterval)
        setPdfProgress(0)
        return
      }

      let acta = existingActa
      if (!acta) {
        setPdfProgressText('Creando acta para firma del receptor...')
        setPdfProgress(60)
        acta = await ActasService.createActa({
          hardware_asset_id: asset.id,
          generador_nombre: firmaEmpresa.nombre,
          generador_cedula: firmaEmpresa.cedula,
          generador_firma_url: firmaEmpresa.firmaUrl,
        })
      }

      if (!acta?.link_temporal) {
        throw new Error('No se pudo generar el link pÃºblico de firma')
      }

      const signingUrl = `${window.location.origin}/actas/${acta.link_temporal}`
      setPdfProgressText('Enviando link de firma por correo...')
      setPdfProgress(80)

      const mailRes = await fetch('/api/actas/send-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: hardware.correo_responsable,
          signingUrl,
          hardwareName: hardware.name,
          clientName: empresaCliente?.nombre,
          recipientName: hardware.persona_responsable || undefined,
        }),
      })

      if (!mailRes.ok) {
        const data = await mailRes.json().catch(() => ({}))
        throw new Error(data?.error || 'No se pudo enviar el correo con el link de firma')
      }

      clearInterval(progressInterval)
      setPdfProgress(100)
      setPdfProgressText('Â¡Link enviado!')

      setTimeout(() => {
        setGeneratingPDF(false)
        setPdfProgress(0)
        toast.success('Link de firma enviado por correo', {
          description: 'Cuando el receptor firme, podrÃ¡s descargar el acta.',
        })
      }, 700)

      return

      /*
      // ==========================================
      // GENERACIÃ“N DIRECTA DE PDF (SIN FIRMAS) - DESHABILITADO
      // ==========================================
      setPdfProgress(30)
      const hardware = await hardwareService.getById(asset.id)

      if (!hardware) throw new Error('No se pudo obtener la informaciÃ³n del hardware')

      setPdfProgressText('Obteniendo informaciÃ³n del cliente...')
      setPdfProgress(50)

      // Obtener informaciÃ³n del cliente para mostrar en el PDF
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
          cargo: 'TÃ©cnico de Soporte',
        },
        recibidoPor: {
          nombre: hardware.persona_responsable || undefined,
        },
      })

      clearInterval(progressInterval)
      setPdfProgress(100)
      setPdfProgressText('Â¡Completado!')

      setTimeout(() => {
        setGeneratingPDF(false)
        setPdfProgress(0)
        toast.success('Acta de Entrega generada', {
          description: 'El PDF se ha descargado correctamente.',
        })
      }, 1000)
      */

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
      <div className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar hardware..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="pl-8"
          />
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row md:ml-auto md:w-auto">
          <Select
            value={typeFilterValue}
            onValueChange={(value) => table.getColumn('type')?.setFilterValue(value === 'all' ? undefined : value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {typeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilterValue}
            onValueChange={(value) => table.getColumn('status')?.setFilterValue(value === 'all' ? undefined : value)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="maintenance">Mantenimiento</SelectItem>
              <SelectItem value="retired">Retirado</SelectItem>
            </SelectContent>
          </Select>
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
          PÃ¡gina {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} Â· {table.getFilteredRowModel().rows.length} resultado(s)
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
              Modifica los datos del activo tecnológico de hardware.
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

      {/* PDF Generation Progress Dialog */}
      <Dialog open={generatingPDF} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              {pdfType === 'acta' ? 'Generando Acta' : 'Generando Hoja de Vida'}
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