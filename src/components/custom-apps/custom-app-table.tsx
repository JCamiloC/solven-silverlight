'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useCustomApplications,
  useDeleteCustomApplication,
} from '@/hooks/use-custom-applications'
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
  ExternalLink,
  Eye,
  Globe,
  Server,
  AlertTriangle,
  Search,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const statusConfig = {
  active: { label: 'Activo', variant: 'default' as const, color: 'bg-green-500' },
  maintenance: { label: 'Mantenimiento', variant: 'secondary' as const, color: 'bg-yellow-500' },
  inactive: { label: 'Inactivo', variant: 'outline' as const, color: 'bg-gray-500' },
  development: { label: 'Desarrollo', variant: 'secondary' as const, color: 'bg-blue-500' },
}

interface CustomAppTableProps {
  clientId?: string
  onEdit?: (id: string) => void
}

export function CustomAppTable({ clientId, onEdit }: CustomAppTableProps) {
  const router = useRouter()
  const { data: applications, isLoading } = useCustomApplications()
  const deleteApp = useDeleteCustomApplication()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [appToDelete, setAppToDelete] = useState<string | null>(null)

  const filteredApps = applications?.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    const matchesClient = !clientId || app.client_id === clientId

    return matchesSearch && matchesStatus && matchesClient
  })

  const handleDelete = async () => {
    if (!appToDelete) return
    await deleteApp.mutateAsync(appToDelete)
    setDeleteDialogOpen(false)
    setAppToDelete(null)
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
            placeholder="Buscar aplicaciones..."
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
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="development">Desarrollo</SelectItem>
            <SelectItem value="maintenance">Mantenimiento</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aplicación</TableHead>
              {!clientId && <TableHead>Cliente</TableHead>}
              <TableHead>Estado</TableHead>
              <TableHead>URLs</TableHead>
              <TableHead>Dominio</TableHead>
              <TableHead>Hosting</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApps && filteredApps.length > 0 ? (
              filteredApps.map((app) => {
                const status = statusConfig[app.status as keyof typeof statusConfig]
                const domainExpiring = isExpiringSoon(app.domain_expiry_date)
                const hostingExpiring = isExpiringSoon(app.hosting_renewal_date)

                return (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium">{app.name}</div>
                        {app.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {app.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {!clientId && (
                      <TableCell>
                        <div className="text-sm">{app.clients?.name}</div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={status.variant}>
                        <div className={`w-2 h-2 rounded-full ${status.color} mr-2`} />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {app.production_url && (
                          <a
                            href={app.production_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3" />
                            Producción
                          </a>
                        )}
                        {app.staging_url && (
                          <a
                            href={app.staging_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                          >
                            <Server className="h-3 w-3" />
                            Staging
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {app.domain_expiry_date ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {format(new Date(app.domain_expiry_date), 'dd/MM/yyyy', { locale: es })}
                          </span>
                          {domainExpiring && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.hosting_renewal_date ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {format(new Date(app.hosting_renewal_date), 'dd/MM/yyyy', { locale: es })}
                          </span>
                          {hostingExpiring && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
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
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/software/${app.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit?.(app.id)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {app.production_url && (
                            <DropdownMenuItem asChild>
                              <a
                                href={app.production_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir app
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setAppToDelete(app.id)
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
                  colSpan={clientId ? 6 : 7}
                  className="h-24 text-center"
                >
                  No se encontraron aplicaciones
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
            <AlertDialogTitle>¿Eliminar aplicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la aplicación
              y todos sus seguimientos asociados.
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
