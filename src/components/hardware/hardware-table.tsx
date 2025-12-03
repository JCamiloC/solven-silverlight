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
  Download
} from 'lucide-react'
import { HardwareAsset } from '@/types'
import { HardwareForm } from './hardware-form'
import { useUpdateHardware, useDeleteHardware, useGetFollowUps } from '@/hooks/use-hardware'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface HardwareTableProps {
  data: HardwareAsset[]
  isLoading?: boolean
  clientId?: string  // Added for navigation
}

export function HardwareTable({ data, isLoading, clientId }: HardwareTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [editingAsset, setEditingAsset] = useState<HardwareAsset | null>(null)
  
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
    {
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
              <DropdownMenuItem onClick={() => downloadReport(asset)}>
                <Download className="mr-2 h-4 w-4" />
                Descargar Reporte
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
    },
  ]

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

  const generateLifesheet = (asset: HardwareAsset) => {
    console.log('Generate lifesheet for:', asset)
    // TODO: Implement PDF generation
  }

  const downloadReport = (asset: HardwareAsset) => {
    console.log('Download report for:', asset)
    // TODO: Implement report download
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

    </div>
  )
}