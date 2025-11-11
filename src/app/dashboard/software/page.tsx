'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Calendar, DollarSign, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useSoftwareLicenses, useSoftwareStats, useCreateSoftwareLicense, useUpdateSoftwareLicense, useDeleteSoftwareLicense } from '@/hooks/use-software'
import { useClients } from '@/hooks/use-clients'
import { SoftwareLicenseWithRelations, SoftwareLicenseInsert, SoftwareLicenseUpdate } from '@/lib/services/software'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

export default function SoftwarePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingLicense, setEditingLicense] = useState<SoftwareLicenseWithRelations | null>(null)

  // Hooks
  const { data: licenses, isLoading, error } = useSoftwareLicenses()
  const { data: stats, isLoading: statsLoading } = useSoftwareStats()
  const { data: clients } = useClients()
  const createMutation = useCreateSoftwareLicense()
  const updateMutation = useUpdateSoftwareLicense()
  const deleteMutation = useDeleteSoftwareLicense()

  // Status badge configuration
  const statusConfig = {
    active: { variant: 'default' as const, icon: CheckCircle, label: 'Activa' },
    expired: { variant: 'destructive' as const, icon: XCircle, label: 'Expirada' },
    cancelled: { variant: 'secondary' as const, icon: XCircle, label: 'Cancelada' },
  }

  // License type badge configuration
  const typeConfig = {
    perpetual: { variant: 'default' as const, label: 'Perpetua' },
    subscription: { variant: 'outline' as const, label: 'Suscripción' },
    oem: { variant: 'secondary' as const, label: 'OEM' },
  }

  // Filter licenses
  const filteredLicenses = licenses?.filter(license => {
    const matchesSearch = license.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         license.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         license.version.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || license.status === statusFilter
    const matchesType = typeFilter === 'all' || license.license_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  }) || []

  // Check if license is expiring soon (within 30 days)
  const isExpiringSoon = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return expiry <= thirtyDaysFromNow && expiry > new Date()
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO')
  }

  // Handle create license
  const handleCreateLicense = (data: SoftwareLicenseInsert) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false)
      }
    })
  }

  // Handle edit license
  const handleEditLicense = (data: SoftwareLicenseUpdate) => {
    if (!editingLicense) return
    updateMutation.mutate({ id: editingLicense.id, data }, {
      onSuccess: () => {
        setIsEditDialogOpen(false)
        setEditingLicense(null)
      }
    })
  }

  // Handle delete license
  const handleDeleteLicense = (id: string) => {
    deleteMutation.mutate(id)
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center text-red-600">
          Error al cargar las licencias: {(error as Error).message}
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Software</h1>
            <p className="text-muted-foreground">
              Administra licencias de software y controla renovaciones
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Licencia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nueva Licencia</DialogTitle>
                <DialogDescription>
                  Registra una nueva licencia de software en el sistema
                </DialogDescription>
              </DialogHeader>
              <SoftwareForm
                clients={clients || []}
                onSubmit={handleCreateLicense}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Licencias</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  <div className="h-7 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.active || 0} activas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  <div className="h-7 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600">{stats?.expiringSoon || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Próximos 30 días
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiradas</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  <div className="h-7 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">{stats?.expired || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Requieren renovación
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inversión Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  <div className="h-7 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.totalCost || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    En licencias activas
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, proveedor o versión..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="perpetual">Perpetua</SelectItem>
                  <SelectItem value="subscription">Suscripción</SelectItem>
                  <SelectItem value="oem">OEM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Licenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Licencias de Software</CardTitle>
            <CardDescription>
              {filteredLicenses.length} de {licenses?.length || 0} licencias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Software</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Asientos</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
                            <div className="h-3 bg-muted animate-pulse rounded w-24"></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted animate-pulse rounded w-28"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-muted animate-pulse rounded w-20"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-muted animate-pulse rounded w-16"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted animate-pulse rounded w-8"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-8 bg-muted animate-pulse rounded w-16"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredLicenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No se encontraron licencias
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLicenses.map((license) => {
                      const statusBadge = statusConfig[license.status]
                      const typeBadge = typeConfig[license.license_type]
                      const StatusIcon = statusBadge.icon
                      const expiringSoon = isExpiringSoon(license.expiry_date)

                      return (
                        <TableRow key={license.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{license.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {license.vendor} v{license.version}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {license.client?.name || 'Sin asignar'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={typeBadge.variant}>
                              {typeBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge.variant}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {statusBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{license.seats}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {license.expiry_date ? (
                                <>
                                  <span className="text-sm">
                                    {formatDate(license.expiry_date)}
                                  </span>
                                  {expiringSoon && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="mr-1 h-2 w-2" />
                                      Próximo
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground">Perpetua</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(license.cost)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingLicense(license)
                                  setIsEditDialogOpen(true)
                                }}
                              >
                                Editar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive">
                                    Eliminar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se eliminará permanentemente
                                      la licencia "{license.name}" del sistema.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteLicense(license.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Licencia</DialogTitle>
              <DialogDescription>
                Modifica los datos de la licencia de software
              </DialogDescription>
            </DialogHeader>
            {editingLicense && (
              <SoftwareForm
                clients={clients || []}
                initialData={editingLicense}
                onSubmit={handleEditLicense}
                isLoading={updateMutation.isPending}
                isEdit
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}

// Software Form Component
interface SoftwareFormProps {
  clients: Array<{ id: string; name: string }>
  initialData?: SoftwareLicenseWithRelations
  onSubmit: (data: any) => void
  isLoading: boolean
  isEdit?: boolean
}

function SoftwareForm({ clients, initialData, onSubmit, isLoading, isEdit }: SoftwareFormProps) {
  const [formData, setFormData] = useState({
    client_id: initialData?.client_id || '',
    name: initialData?.name || '',
    vendor: initialData?.vendor || '',
    version: initialData?.version || '',
    license_key: initialData?.license_key || '',
    license_type: initialData?.license_type || 'subscription',
    seats: initialData?.seats || 1,
    purchase_date: initialData?.purchase_date || '',
    expiry_date: initialData?.expiry_date || '',
    cost: initialData?.cost || 0,
    status: initialData?.status || 'active',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSubmit = {
      ...formData,
      cost: Number(formData.cost),
      seats: Number(formData.seats),
      expiry_date: formData.expiry_date || undefined,
    }
    onSubmit(dataToSubmit)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="client_id">Cliente</Label>
          <Select
            value={formData.client_id}
            onValueChange={(value) => setFormData({ ...formData, client_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Software</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Microsoft Office 365"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendor">Proveedor</Label>
          <Input
            id="vendor" 
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            placeholder="Microsoft"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Versión</Label>
          <Input
            id="version"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            placeholder="2024"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="license_type">Tipo de Licencia</Label>
          <Select
            value={formData.license_type}
            onValueChange={(value: 'perpetual' | 'subscription' | 'oem') => 
              setFormData({ ...formData, license_type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subscription">Suscripción</SelectItem>
              <SelectItem value="perpetual">Perpetua</SelectItem>
              <SelectItem value="oem">OEM</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seats">Número de Asientos</Label>
          <Input
            id="seats"
            type="number"
            min="1"
            value={formData.seats}
            onChange={(e) => setFormData({ ...formData, seats: Number(e.target.value) })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase_date">Fecha de Compra</Label>
          <Input
            id="purchase_date"
            type="date"
            value={formData.purchase_date}
            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiry_date">Fecha de Vencimiento</Label>
          <Input
            id="expiry_date"
            type="date"
            value={formData.expiry_date}
            onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost">Costo</Label>
          <Input
            id="cost"
            type="number"
            min="0"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select
            value={formData.status}
            onValueChange={(value: 'active' | 'expired' | 'cancelled') => 
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="expired">Expirada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="license_key">Clave de Licencia</Label>
        <Textarea
          id="license_key"
          value={formData.license_key}
          onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
          placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear')} Licencia
        </Button>
      </div>
    </form>
  )
}