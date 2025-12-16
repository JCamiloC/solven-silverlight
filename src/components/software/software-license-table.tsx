'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useSoftwareLicenses,
  useDeleteSoftwareLicense,
  useSoftwareByClient,
} from '@/hooks/use-software'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  AlertTriangle,
  Search,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const statusConfig = {
  active: { label: 'Activa', variant: 'default' as const, color: 'bg-green-500' },
  expired: { label: 'Vencida', variant: 'destructive' as const, color: 'bg-red-500' },
  cancelled: { label: 'Cancelada', variant: 'outline' as const, color: 'bg-gray-500' },
}

const licenseTypeConfig = {
  perpetual: 'Perpetua',
  subscription: 'Suscripción',
  oem: 'OEM',
}

interface SoftwareLicenseTableProps {
  clientId?: string
  onEdit?: (id: string) => void
}

export function SoftwareLicenseTable({ clientId, onEdit }: SoftwareLicenseTableProps) {
  const router = useRouter()
  const { data: allLicenses, isLoading: loadingAll } = useSoftwareLicenses()
  const { data: clientLicenses, isLoading: loadingClient } = useSoftwareByClient(clientId || '')
  const deleteLicense = useDeleteSoftwareLicense()

  const licenses = clientId ? clientLicenses : allLicenses
  const isLoading = clientId ? loadingClient : loadingAll

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [licenseToDelete, setLicenseToDelete] = useState<string | null>(null)

  const filteredLicenses = licenses?.filter((license) => {
    const matchesSearch =
      license.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.client?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || license.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleDelete = async () => {
    if (!licenseToDelete) return
    await deleteLicense.mutateAsync(licenseToDelete)
    setDeleteDialogOpen(false)
    setLicenseToDelete(null)
  }

  const isExpiringSoon = (date: string | null | undefined) => {
    if (!date) return false
    const expiry = new Date(date)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar licencias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="expired">Vencida</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Licencia</TableHead>
              {!clientId && <TableHead>Cliente</TableHead>}
              <TableHead>Proveedor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Puestos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLicenses && filteredLicenses.length > 0 ? (
              filteredLicenses.map((license) => {
                const status = statusConfig[license.status as keyof typeof statusConfig]
                const expiring = isExpiringSoon(license.expiry_date)

                return (
                  <TableRow key={license.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium">{license.name}</div>
                        <div className="text-sm text-muted-foreground">
                          v{license.version}
                        </div>
                      </div>
                    </TableCell>
                    {!clientId && (
                      <TableCell>
                        <div className="text-sm">{license.client?.name}</div>
                      </TableCell>
                    )}
                    <TableCell>{license.vendor}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {licenseTypeConfig[license.license_type as keyof typeof licenseTypeConfig]}
                      </Badge>
                    </TableCell>
                    <TableCell>{license.seats}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>
                        <div className={`w-2 h-2 rounded-full ${status.color} mr-2`} />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {license.expiry_date ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {format(new Date(license.expiry_date), 'dd/MM/yyyy', { locale: es })}
                          </span>
                          {expiring && license.status === 'active' && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin vencimiento</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEdit?.(license.id)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setLicenseToDelete(license.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={clientId ? 8 : 9}
                  className="h-24 text-center"
                >
                  No se encontraron licencias
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar licencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la licencia
              del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
