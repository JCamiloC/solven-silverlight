'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Search, Eye, EyeOff, Shield, Key, Clock, Copy, AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { SecureRoute, SecurityProvider } from '@/components/security/security-provider'
import { TwoFactorRequiredNotice } from '@/components/security/2fa-required-notice'
import { useAuth } from '@/hooks/use-auth'
import { useClient } from '@/hooks/use-clients'
import { Loading } from '@/components/ui/loading'
import { 
  useAccessCredentialsByClient,
  useAccessStatsByClient,
  useCreateAccessCredential, 
  useUpdateAccessCredential, 
  useDeleteAccessCredential,
  useRevealPassword,
} from '@/hooks/use-access-credentials'
import { 
  AccessCredentialWithRelations, 
  AccessCredentialInsert, 
  AccessCredentialUpdate 
} from '@/lib/services/access-credentials'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function ClienteAccesosPage() {
  const { profile } = useAuth()
  const has2FA = profile?.totp_enabled === true

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
      {!has2FA ? (
        <TwoFactorRequiredNotice />
      ) : (
        <SecurityProvider>
          <SecureRoute requireAdmin={false}>
            <ClienteAccesosContent />
          </SecureRoute>
        </SecurityProvider>
      )}
    </ProtectedRoute>
  )
}

function ClienteAccesosContent() {
  const { id } = useParams()
  const router = useRouter()
  const clientId = typeof id === 'string' ? id : ''
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCredential, setEditingCredential] = useState<AccessCredentialWithRelations | null>(null)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({})

  // Hooks
  const { data: client, isLoading: isLoadingClient } = useClient(clientId)
  const { data: credentials, isLoading, error } = useAccessCredentialsByClient(clientId)
  const { data: stats, isLoading: isLoadingStats } = useAccessStatsByClient(clientId)
  const { profile } = useAuth()
  const createMutation = useCreateAccessCredential()
  const updateMutation = useUpdateAccessCredential()
  const deleteMutation = useDeleteAccessCredential()
  const revealMutation = useRevealPassword()

  // Status badge configuration
  const statusConfig = {
    active: { variant: 'default' as const, label: 'Activa' },
    inactive: { variant: 'secondary' as const, label: 'Inactiva' },
  }

  // Filter credentials
  const filteredCredentials = credentials?.filter(credential => {
    const matchesSearch = credential.system_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credential.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || credential.status === statusFilter
    return matchesSearch && matchesStatus
  }) || []

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Reveal password
  const handleRevealPassword = async (credentialId: string) => {
    try {
      const result = await revealMutation.mutateAsync({
        id: credentialId,
        purpose: 'Visualización desde módulo de cliente'
      })
      
      if (!result) {
        toast.error('No se pudo obtener la contraseña')
        return
      }
      
      setRevealedPasswords(prev => ({
        ...prev,
        [credentialId]: result.password
      }))

      // Auto-hide password after 30 seconds
      setTimeout(() => {
        setRevealedPasswords(prev => {
          const newState = { ...prev }
          delete newState[credentialId]
          return newState
        })
      }, 30000)
    } catch (error) {
      console.error('Error revealing password:', error)
      toast.error('Error al revelar la contraseña')
    }
  }

  // Copy to clipboard
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${field} copiado al portapapeles`)
  }

  // Handle create
  const handleCreate = async (data: AccessCredentialInsert) => {
    try {
      await createMutation.mutateAsync({ ...data, client_id: clientId })
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Error creating credential:', error)
    }
  }

  // Handle update
  const handleUpdate = async (id: string, data: AccessCredentialUpdate) => {
    try {
      await updateMutation.mutateAsync({ id, data })
      setIsEditDialogOpen(false)
      setEditingCredential(null)
    } catch (error) {
      console.error('Error updating credential:', error)
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error) {
      console.error('Error deleting credential:', error)
    }
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar las credenciales: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoadingClient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" text="Cargando información del cliente..." />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/clientes/${clientId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-7 w-7" />
            Accesos de {client?.name || 'Cliente'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestión segura de credenciales y accesos del cliente
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Credencial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Nueva Credencial</DialogTitle>
              <DialogDescription>
                Complete los datos de la credencial de acceso. La contraseña se encriptará automáticamente.
              </DialogDescription>
            </DialogHeader>
            <AccessCredentialForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Las contraseñas están encriptadas. Solo usuarios con 2FA habilitado pueden ver las credenciales.
          Todos los accesos son registrados con fines de auditoría.
        </AlertDescription>
      </Alert>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingStats ? '...' : stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Credenciales totales</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{isLoadingStats ? '...' : stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">En uso actualmente</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{isLoadingStats ? '...' : stats?.inactive || 0}</div>
            <p className="text-xs text-muted-foreground">Deshabilitadas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accesos Recientes</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{isLoadingStats ? '...' : stats?.recentlyAccessed || 0}</div>
            <p className="text-xs text-muted-foreground">Últimos 7 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por sistema o usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="inactive">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Credentials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Credenciales de Acceso</CardTitle>
          <CardDescription>
            {filteredCredentials.length} credencial(es) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loading text="Cargando credenciales..." />
            </div>
          ) : filteredCredentials.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No se encontraron credenciales
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Contraseña</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último Acceso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredentials.map((credential) => (
                    <TableRow key={credential.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          {credential.system_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{credential.username}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopy(credential.username, 'Usuario')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {revealedPasswords[credential.id] ? (
                            <>
                              <span className="font-mono text-sm">{revealedPasswords[credential.id]}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  setRevealedPasswords(prev => {
                                    const newState = { ...prev }
                                    delete newState[credential.id]
                                    return newState
                                  })
                                }}
                              >
                                <EyeOff className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleCopy(revealedPasswords[credential.id], 'Contraseña')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-muted-foreground">••••••••</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleRevealPassword(credential.id)}
                                disabled={revealMutation.isPending}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {credential.url ? (
                          <a
                            href={credential.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            Abrir
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[credential.status].variant}>
                          {statusConfig[credential.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {credential.last_accessed 
                            ? formatDate(credential.last_accessed)
                            : 'Nunca'
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCredential(credential)
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
                                  Esta acción no se puede deshacer. La credencial "{credential.system_name}" será eliminada permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(credential.id)}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Credencial</DialogTitle>
            <DialogDescription>
              Actualiza los datos de la credencial de acceso
            </DialogDescription>
          </DialogHeader>
          {editingCredential && (
            <AccessCredentialForm
              credential={editingCredential}
              onSubmit={(data) => handleUpdate(editingCredential.id, data)}
              onCancel={() => {
                setIsEditDialogOpen(false)
                setEditingCredential(null)
              }}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Form Component
interface AccessCredentialFormProps {
  credential?: AccessCredentialWithRelations
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading: boolean
}

function AccessCredentialForm({ credential, onSubmit, onCancel, isLoading }: AccessCredentialFormProps) {
  const { profile } = useAuth()
  const [formData, setFormData] = useState({
    system_name: credential?.system_name || '',
    username: credential?.username || '',
    password: '', // Always empty for security
    url: credential?.url || '',
    notes: credential?.notes || '',
    status: credential?.status || 'active' as const,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const submitData: any = {
      system_name: formData.system_name,
      username: formData.username,
      url: formData.url || undefined,
      notes: formData.notes || undefined,
      status: formData.status,
    }

    // Only include password if it's been changed
    if (formData.password) {
      submitData.password = formData.password
    }

    if (!credential) {
      submitData.created_by = profile!.id
    }

    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="system_name">Sistema / Aplicación *</Label>
        <Input
          id="system_name"
          value={formData.system_name}
          onChange={(e) => setFormData(prev => ({ ...prev, system_name: e.target.value }))}
          placeholder="Ej: Servidor FTP, Panel Admin, etc."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Usuario *</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
          placeholder="Nombre de usuario"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Contraseña {credential ? '(dejar en blanco para no cambiar)' : '*'}
        </Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          placeholder="Contraseña"
          required={!credential}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL (Opcional)</Label>
        <Input
          id="url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
          placeholder="https://ejemplo.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Estado *</Label>
        <Select 
          value={formData.status} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="inactive">Inactiva</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (Opcional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Información adicional sobre esta credencial"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : credential ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
