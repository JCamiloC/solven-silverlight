'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  UserCheck, 
  UserX,
  Settings,
  Loader2,
  Search,
  Filter
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-users'
import { useClients } from '@/hooks/use-clients'
import { useInviteUser, usePendingUsers } from '@/hooks/use-user-invitations'
import { User, UserInsert, UserUpdate } from '@/lib/services/users'

export default function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showPassword, setShowPassword] = useState(false)

  const { user: currentUser, hasRole, loading } = useAuth()
  const { data: users = [], isLoading: usersLoading } = useUsers()
  const { data: clients = [] } = useClients()
  // Log para depuración de clientes
  console.log('[Usuarios Debug] Clientes recibidos:', clients)

  // Consulta directa a Supabase para depuración
  import('@/lib/supabase/client').then(({ createClient }) => {
    const supabase = createClient();
    supabase.from('clients').select('*').then((res) => {
      console.log('[Usuarios Debug] Consulta directa a clients:', res);
    });
  });
  
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()
  const inviteUserMutation = useInviteUser()
  const { data: pendingUsers = [] } = usePendingUsers()

  // Permisos
  const canManageUsers = hasRole(['administrador'])
  const canViewUsers = hasRole(['administrador', 'lider_soporte'])
  const canCreateUsers = hasRole(['administrador'])
  const canEditUsers = hasRole(['administrador'])
  const canDeleteUsers = hasRole(['administrador'])

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!canViewUsers) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4 max-w-md">
          <Users className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">Acceso Restringido</h2>
          <p className="text-muted-foreground">
            Solo los administradores pueden acceder a la gestión de usuarios.
          </p>
        </div>
      </div>
    )
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      administrador: { variant: 'default' as const, label: 'Administrador' },
      lider_soporte: { variant: 'secondary' as const, label: 'Líder Soporte' },
      agente_soporte: { variant: 'outline' as const, label: 'Agente Soporte' },
      cliente: { variant: 'secondary' as const, label: 'Cliente' },
    }
    
    const config = variants[role as keyof typeof variants] || variants.cliente
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }

  const getTwoFABadge = (enabled: boolean) => {
    return (
      <Badge variant={enabled ? 'default' : 'secondary'}>
        {enabled ? (
          <>
            <UserCheck className="h-3 w-3 mr-1" />
            2FA Activo
          </>
        ) : (
          <>
            <UserX className="h-3 w-3 mr-1" />
            Sin 2FA
          </>
        )}
      </Badge>
    )
  }

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = !roleFilter || roleFilter === 'all' || user.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  const columns = [
    {
      key: 'first_name' as keyof User,
      label: 'Nombre Completo',
      render: (value: string | undefined, user: User) => `${user.first_name} ${user.last_name}`,
    },
    {
      key: 'email' as keyof User,
      label: 'Email',
    },
    {
      key: 'role' as keyof User,
      label: 'Rol',
      render: (value: string | undefined) => value ? getRoleBadge(value) : null,
    },
    {
      key: 'created_at' as keyof User,
      label: 'Creado',
      render: (value: string | undefined) => value ? new Date(value).toLocaleDateString() : '',
    },
  ]

  const handleAdd = () => {
    if (!canCreateUsers) return
    setSelectedUser(null)
    setIsDialogOpen(true)
  }

  const handleInviteClick = () => {
    if (!canCreateUsers) return
    setIsInviteDialogOpen(true)
  }

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const invitationData = {
      email: formData.get('email') as string,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      phone: formData.get('phone') as string,
      role: formData.get('role') as User['role'],
    }

    inviteUserMutation.mutate(invitationData, {
      onSuccess: (result) => {
        if (result.success) {
          setIsInviteDialogOpen(false)
        }
      }
    })
  }

  const handleEdit = (user: User) => {
    if (!canEditUsers) return
    setSelectedUser(user)
    setIsDialogOpen(true)
  }

  const handleDelete = (user: User) => {
    if (!canDeleteUsers) return
    if (user.id === currentUser?.id) {
      alert('No puedes eliminar tu propio usuario')
      return
    }
    
    if (confirm(`¿Estás seguro de que deseas eliminar a ${user.first_name} ${user.last_name}?`)) {
      deleteUserMutation.mutate(user.id)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentUser) return

    const formData = new FormData(e.currentTarget)
    
    const userData = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      role: formData.get('role') as User['role'],
      password: formData.get('password') as string,
      client_id: formData.get('client_id') as string,
    }

    if (selectedUser) {
      // Actualizar usuario existente (sin password)
      const { password, email, ...updateData } = userData
      updateUserMutation.mutate({
        id: selectedUser.id,
        data: updateData as UserUpdate
      }, {
        onSuccess: () => {
          setIsDialogOpen(false)
          setSelectedUser(null)
        }
      })
    } else {
      // Crear nuevo usuario con email y password
      createUserMutation.mutate(userData as any, {
        onSuccess: () => {
          setIsDialogOpen(false)
        }
      })
    }
  }

  const statsCards = [
    {
      title: 'Total Usuarios',
      value: users.length,
      icon: Users,
      description: 'Usuarios registrados'
    },
    {
      title: 'Administradores',
      value: users.filter(u => u.role === 'administrador').length,
      icon: Shield,
      description: 'Usuarios con permisos admin'
    },
    {
      title: 'Agentes de Soporte',
      value: users.filter(u => u.role === 'agente_soporte' || u.role === 'lider_soporte').length,
      icon: UserCheck,
      description: 'Personal de soporte'
    },
    {
      title: 'Invitaciones Pendientes',
      value: pendingUsers.length,
      icon: UserPlus,
      description: 'Usuarios invitados sin confirmar'
    }
  ]

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        {canCreateUsers && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleInviteClick}>
              <Mail className="mr-2 h-4 w-4" />
              Invitar Usuario
            </Button>
            <Button onClick={handleAdd}>
              <UserPlus className="mr-2 h-4 w-4" />
              Crear Usuario
            </Button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Label htmlFor="search">Buscar usuarios</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="lider_soporte">Líder Soporte</SelectItem>
                  <SelectItem value="agente_soporte">Agente Soporte</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        title="Lista de Usuarios"
        onAdd={canCreateUsers ? handleAdd : undefined}
        onEdit={canEditUsers ? handleEdit : undefined}
        onDelete={canDeleteUsers ? handleDelete : undefined}
        addButtonText="Crear Usuario"
      />

      {/* Add/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser 
                ? 'Modifica la información del usuario existente'
                : 'Crea un nuevo usuario en el sistema'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre *</Label>
                <Input 
                  id="first_name" 
                  name="first_name"
                  placeholder="Nombre"
                  defaultValue={selectedUser?.first_name}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido *</Label>
                <Input 
                  id="last_name" 
                  name="last_name"
                  placeholder="Apellido"
                  defaultValue={selectedUser?.last_name}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input 
                id="email" 
                name="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                defaultValue={selectedUser?.email}
                disabled={!!selectedUser}
                required
              />
              {selectedUser && (
                <p className="text-xs text-muted-foreground">
                  El email no puede ser modificado después de crear el usuario
                </p>
              )}
            </div>
            
            {!selectedUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Contraseña segura"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres. Se recomienda una contraseña segura.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Rol *</Label>
                <Select name="role" defaultValue={selectedUser?.role || 'cliente'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="lider_soporte">Líder de Soporte</SelectItem>
                    <SelectItem value="agente_soporte">Agente de Soporte</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  name="phone"
                  placeholder="Número de teléfono"
                  defaultValue={selectedUser?.phone || ''}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente (Empresa) *</Label>
              <Select 
                name="client_id" 
                defaultValue={selectedUser?.client_id || ''}
                required
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
              <p className="text-xs text-muted-foreground">
                Selecciona la empresa cliente a la que pertenece este usuario
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => {
                  setIsDialogOpen(false)
                  setSelectedUser(null)
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
              >
                {(createUserMutation.isPending || updateUserMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {selectedUser ? 'Actualizar Usuario' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Se enviará una invitación por email al usuario para que configure su cuenta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre *</Label>
                <Input
                  name="first_name"
                  placeholder="Nombre"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido *</Label>
                <Input
                  name="last_name"
                  placeholder="Apellido"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                name="email"
                type="email"
                placeholder="usuario@empresa.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select name="role" required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="lider_soporte">Líder de Soporte</SelectItem>
                  <SelectItem value="agente_soporte">Agente de Soporte</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                name="phone"
                placeholder="Número de teléfono"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => setIsInviteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={inviteUserMutation.isPending}
              >
                {inviteUserMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enviar Invitación
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}