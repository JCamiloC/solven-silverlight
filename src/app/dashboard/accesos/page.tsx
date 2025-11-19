'use client'

import { useState } from 'react'
import { Plus, Search, Eye, EyeOff, Shield, AlertTriangle, Key, Clock, Copy, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { SecureRoute, SecurityProvider } from '@/components/security/security-provider'
import { TwoFactorRequiredNotice } from '@/components/security/2fa-required-notice'
import { useAuth } from '@/hooks/use-auth'
import { 
  useAccessCredentials, 
  useAccessStats, 
  useCreateAccessCredential, 
  useUpdateAccessCredential, 
  useDeleteAccessCredential,
  useRevealPassword,
  useAccessLogs
} from '@/hooks/use-access-credentials'
import { useClients } from '@/hooks/use-clients'
import { 
  AccessCredentialWithRelations, 
  AccessCredentialInsert, 
  AccessCredentialUpdate 
} from '@/lib/services/access-credentials'
import { PasswordService } from '@/lib/crypto'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export default function AccessCredentialsPage() {
  const { profile } = useAuth()
  
  // Verificar si el usuario tiene 2FA habilitado
  const has2FA = profile?.totp_enabled === true

  return (
    <ProtectedRoute allowedRoles={['administrador']}>
      {!has2FA ? (
        <TwoFactorRequiredNotice />
      ) : (
        <SecurityProvider>
          <SecureRoute requireAdmin>
            <AccessCredentialsContent />
          </SecureRoute>
        </SecurityProvider>
      )}
    </ProtectedRoute>
  )
}

function AccessCredentialsContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCredential, setEditingCredential] = useState<AccessCredentialWithRelations | null>(null)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({})
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null)

  // Hooks
  const { data: credentials, isLoading, error } = useAccessCredentials()
  const { data: stats, isLoading: statsLoading } = useAccessStats()
  const { data: clients } = useClients()
  const { data: accessLogs } = useAccessLogs()
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
                         credential.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credential.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
      minute: '2-digit'
    })
  }

  // Handle create credential
  const handleCreateCredential = (data: AccessCredentialInsert) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false)
      }
    })
  }

  // Handle edit credential
  const handleEditCredential = (data: AccessCredentialUpdate) => {
    if (!editingCredential) return
    updateMutation.mutate({ id: editingCredential.id, data }, {
      onSuccess: () => {
        setIsEditDialogOpen(false)
        setEditingCredential(null)
      }
    })
  }

  // Handle delete credential
  const handleDeleteCredential = (id: string) => {
    deleteMutation.mutate(id)
  }

  // Handle reveal password
  const handleRevealPassword = async (id: string, systemName: string) => {
    try {
      const result = await revealMutation.mutateAsync({ 
        id, 
        purpose: `Visualización de credencial: ${systemName}` 
      })
      
      if (result?.password) {
        setRevealedPasswords(prev => ({ ...prev, [id]: result.password }))
        
        // Auto-hide password after 30 seconds
        setTimeout(() => {
          setRevealedPasswords(prev => {
            const newState = { ...prev }
            delete newState[id]
            return newState
          })
        }, 30000)
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  // Handle copy password
  const handleCopyPassword = (password: string, systemName: string) => {
    navigator.clipboard.writeText(password)
    toast.success(`Contraseña de ${systemName} copiada al portapapeles`)
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error de Acceso</h2>
          <p className="text-muted-foreground">
            {(error as Error).message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Control de Accesos
          </h1>
          <p className="text-muted-foreground">
            Gestión segura de credenciales con encriptación y auditoría completa
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Credencial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Crear Nueva Credencial
              </DialogTitle>
              <DialogDescription>
                Registra una nueva credencial de acceso. La contraseña será encriptada automáticamente.
              </DialogDescription>
            </DialogHeader>
            <AccessCredentialForm
              clients={clients || []}
              onSubmit={handleCreateCredential}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Security Warning */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Módulo de Alta Seguridad:</strong> Todas las operaciones requieren verificación 2FA. 
          Las contraseñas están encriptadas y todos los accesos son registrados para auditoría.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList>
          <TabsTrigger value="credentials">Credenciales</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credenciales</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
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
                <CardTitle className="text-sm font-medium">Accesos Recientes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-2">
                    <div className="h-7 bg-muted animate-pulse rounded"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats?.recentlyAccessed || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Últimos 7 días
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Accesos</CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-2">
                    <div className="h-7 bg-muted animate-pulse rounded"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats?.totalAccesses || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Registros de auditoría
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactivas</CardTitle>
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
                    <div className="text-2xl font-bold text-orange-600">{stats?.inactive || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Requieren revisión
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
                    placeholder="Buscar por sistema, usuario o cliente..."
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
                    <SelectItem value="inactive">Inactiva</SelectItem>
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
                {filteredCredentials.length} de {credentials?.length || 0} credenciales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sistema</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contraseña</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Acceso</TableHead>
                      <TableHead className="w-[150px]">Acciones</TableHead>
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
                            <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-muted animate-pulse rounded w-28"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-8 bg-muted animate-pulse rounded w-20"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-6 bg-muted animate-pulse rounded w-16"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-8 bg-muted animate-pulse rounded w-16"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredCredentials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No se encontraron credenciales
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCredentials.map((credential) => {
                        const statusBadge = statusConfig[credential.status]
                        const isPasswordRevealed = revealedPasswords[credential.id]

                        return (
                          <TableRow key={credential.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{credential.system_name}</div>
                                {credential.url && (
                                  <div className="text-sm text-muted-foreground">
                                    {credential.url}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-sm">
                                {credential.username}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {credential.client?.name || 'Sin asignar'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isPasswordRevealed ? (
                                  <>
                                    <div className="font-mono text-sm bg-muted p-1 rounded">
                                      {isPasswordRevealed}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopyPassword(isPasswordRevealed, credential.system_name)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
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
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRevealPassword(credential.id, credential.system_name)}
                                    disabled={revealMutation.isPending}
                                  >
                                    <Eye className="mr-1 h-3 w-3" />
                                    {revealMutation.isPending ? 'Verificando...' : 'Revelar'}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadge.variant}>
                                {statusBadge.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {credential.last_accessed 
                                  ? formatDate(credential.last_accessed)
                                  : 'Nunca'
                                }
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
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
                                        Esta acción no se puede deshacer. Se eliminará permanentemente
                                        la credencial "{credential.system_name}" del sistema.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteCredential(credential.id)}
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
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <AuditLogTable logs={accessLogs || []} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Editar Credencial
            </DialogTitle>
            <DialogDescription>
              Modifica los datos de la credencial de acceso
            </DialogDescription>
          </DialogHeader>
          {editingCredential && (
            <AccessCredentialForm
              clients={clients || []}
              initialData={editingCredential}
              onSubmit={handleEditCredential}
              isLoading={updateMutation.isPending}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Access Credential Form Component
interface AccessCredentialFormProps {
  clients: Array<{ id: string; name: string }>
  initialData?: AccessCredentialWithRelations
  onSubmit: (data: any) => void
  isLoading: boolean
  isEdit?: boolean
}

function AccessCredentialForm({ clients, initialData, onSubmit, isLoading, isEdit }: AccessCredentialFormProps) {
  const [formData, setFormData] = useState({
    client_id: initialData?.client_id || '',
    system_name: initialData?.system_name || '',
    username: initialData?.username || '',
    password: '',
    url: initialData?.url || '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'active',
    created_by: initialData?.created_by || ''
  })
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [], isStrong: false })
  const [showPassword, setShowPassword] = useState(false)

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password })
    if (password) {
      const strength = PasswordService.validateStrength(password)
      setPasswordStrength(strength as any)
    } else {
      setPasswordStrength({ score: 0, feedback: [], isStrong: false })
    }
  }

  const generatePassword = () => {
    const generatedPassword = PasswordService.generateSecure(16)
    handlePasswordChange(generatedPassword)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEdit && (!formData.password || !passwordStrength.isStrong)) {
      toast.error('Se requiere una contraseña segura')
      return
    }
    onSubmit(formData)
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
          <Label htmlFor="system_name">Nombre del Sistema</Label>
          <Input
            id="system_name"
            value={formData.system_name}
            onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
            placeholder="Office 365, Servidor FTP, etc."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Usuario</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="admin@empresa.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">URL (Opcional)</Label>
          <Input
            id="url"
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://portal.empresa.com"
          />
        </div>

        <div className="col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generatePassword}
              >
                Generar Segura
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder={isEdit ? "Dejar vacío para mantener actual" : "Contraseña segura"}
            required={!isEdit}
          />
          {formData.password && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      passwordStrength.score >= 80 ? 'bg-green-500' :
                      passwordStrength.score >= 60 ? 'bg-yellow-500' :
                      passwordStrength.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(passwordStrength.score, 10)}%` }}
                  />
                </div>
                <span className="text-xs font-medium">
                  {passwordStrength.isStrong ? 'Fuerte' : 'Débil'}
                </span>
              </div>
              {passwordStrength.feedback.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {passwordStrength.feedback.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select
            value={formData.status}
            onValueChange={(value: 'active' | 'inactive') => 
              setFormData({ ...formData, status: value })
            }
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (Opcional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Información adicional sobre esta credencial..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear')} Credencial
        </Button>
      </div>
    </form>
  )
}

// Audit Log Table Component
interface AuditLogTableProps {
  logs: any[]
}

function AuditLogTable({ logs }: AuditLogTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Registro de Auditoría
        </CardTitle>
        <CardDescription>
          Historial completo de accesos a credenciales para cumplimiento ISO 27001
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha/Hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Credencial</TableHead>
                <TableHead>Propósito</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No hay registros de auditoría
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(log.accessed_at)}
                    </TableCell>
                    <TableCell>
                      {log.accessed_by_profile?.first_name} {log.accessed_by_profile?.last_name}
                    </TableCell>
                    <TableCell>
                      {log.credential?.system_name || 'Credencial eliminada'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.purpose}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ip_address || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}