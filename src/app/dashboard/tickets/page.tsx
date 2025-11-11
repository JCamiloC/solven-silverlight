'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Clock, CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useTickets, useTicketStats, useCreateTicket, useUpdateTicket, useDeleteTicket } from '@/hooks/use-tickets'
import { useClients } from '@/hooks/use-clients'
import { useAssignableUsers } from '@/hooks/use-users'
import { TicketWithRelations, TicketInsert } from '@/lib/services/tickets'

export default function TicketsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<TicketWithRelations | null>(null)
  
  const { user } = useAuth()
  const { data: tickets = [], isLoading: ticketsLoading } = useTickets()
  const { data: stats, isLoading: statsLoading } = useTicketStats()
  const { data: clients = [], isLoading: clientsLoading } = useClients()
  const { data: assignableUsers = [], isLoading: usersLoading } = useAssignableUsers()
  
  const createTicketMutation = useCreateTicket()
  const updateTicketMutation = useUpdateTicket()
  const deleteTicketMutation = useDeleteTicket()

  const getStatusBadge = (status: string) => {
    const variants = {
      open: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Abierto' },
      in_progress: { variant: 'default' as const, icon: Clock, label: 'En Progreso' },
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pendiente' },
      resolved: { variant: 'outline' as const, icon: CheckCircle, label: 'Resuelto' },
      closed: { variant: 'secondary' as const, icon: XCircle, label: 'Cerrado' },
    }
    
    const config = variants[status as keyof typeof variants] || variants.open
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      critical: 'destructive' as const,
      high: 'destructive' as const,
      medium: 'default' as const,
      low: 'secondary' as const,
    }
    
    const labels = {
      critical: 'Crítica',
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
    }
    
    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'default'}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    )
  }

  const getCategoryBadge = (category: string) => {
    const labels = {
      hardware: 'Hardware',
      software: 'Software',
      network: 'Red',
      access: 'Acceso',
      other: 'Otro',
    }
    
    return (
      <Badge variant="outline">
        {labels[category as keyof typeof labels] || category}
      </Badge>
    )
  }

  const columns = [
    {
      key: 'id' as keyof TicketWithRelations,
      label: 'ID',
      render: (value: string, item: TicketWithRelations) => (
        <Button
          variant="link"
          className="p-0 h-auto font-mono"
          onClick={() => window.open(`/dashboard/tickets/${value}`, '_blank')}
        >
          #{value.slice(-8)}
        </Button>
      ),
    },
    {
      key: 'title' as keyof TicketWithRelations,
      label: 'Título',
    },
    {
      key: 'client_id' as keyof TicketWithRelations,
      label: 'Cliente',
      render: (value: string, item: TicketWithRelations) => {
        const client = clients.find(c => c.id === value)
        return client?.name || 'Sin cliente'
      },
    },
    {
      key: 'status' as keyof TicketWithRelations,
      label: 'Estado',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'priority' as keyof TicketWithRelations,
      label: 'Prioridad',
      render: (value: string) => getPriorityBadge(value),
    },
    {
      key: 'category' as keyof TicketWithRelations,
      label: 'Categoría',
      render: (value: string) => getCategoryBadge(value),
    },
    {
      key: 'assigned_to' as keyof TicketWithRelations,
      label: 'Asignado a',
      render: (value: string, item: TicketWithRelations) => {
        if (!value) return 'No asignado'
        const assignedUser = assignableUsers.find(u => u.id === value)
        return assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : 'Usuario no encontrado'
      },
    },
    {
      key: 'created_at' as keyof TicketWithRelations,
      label: 'Creado',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions' as keyof TicketWithRelations,
      label: 'Acciones',
      render: (value: any, item: TicketWithRelations) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`/dashboard/tickets/${item.id}`, '_blank')}
          >
            Ver Detalle
          </Button>
        </div>
      ),
    },
  ]

  const handleAdd = () => {
    setSelectedTicket(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (ticket: TicketWithRelations) => {
    setSelectedTicket(ticket)
    setIsDialogOpen(true)
  }

  const handleDelete = (ticket: TicketWithRelations) => {
    if (confirm('¿Estás seguro de que deseas eliminar este ticket?')) {
      deleteTicketMutation.mutate(ticket.id)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return

    const formData = new FormData(e.currentTarget)
    
    const assignedTo = formData.get('assigned_to') as string
    const ticketData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as TicketInsert['priority'],
      category: formData.get('category') as TicketInsert['category'],
      client_id: formData.get('client_id') as string,
      assigned_to: assignedTo === 'unassigned' ? undefined : assignedTo,
      created_by: user.id,
    }

    if (selectedTicket) {
      const status = formData.get('status') as string
      updateTicketMutation.mutate({
        id: selectedTicket.id,
        data: { ...ticketData, status: status as any }
      }, {
        onSuccess: () => {
          setIsDialogOpen(false)
          setSelectedTicket(null)
        }
      })
    } else {
      createTicketMutation.mutate(ticketData, {
        onSuccess: () => {
          setIsDialogOpen(false)
        }
      })
    }
  }

  if (ticketsLoading || statsLoading || clientsLoading || usersLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Tickets</h1>
          <p className="text-muted-foreground">
            Administra y da seguimiento a todos los tickets de soporte
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tickets
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tickets registrados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Abiertos
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.open || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              En Progreso
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.in_progress || 0}</div>
            <p className="text-xs text-muted-foreground">
              Siendo trabajados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resueltos
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resolved || 0}</div>
            <p className="text-xs text-muted-foreground">
              Completados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <DataTable
        data={tickets}
        columns={columns}
        title="Lista de Tickets"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addButtonText="Crear Ticket"
      />

      {/* Add/Edit Ticket Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTicket ? 'Editar Ticket' : 'Crear Nuevo Ticket'}
            </DialogTitle>
            <DialogDescription>
              {selectedTicket 
                ? 'Modifica los detalles del ticket existente'
                : 'Crea un nuevo ticket de soporte'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título del Ticket</Label>
              <Input 
                id="title" 
                name="title"
                placeholder="Describe brevemente el problema"
                defaultValue={selectedTicket?.title}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description" 
                name="description"
                placeholder="Describe detalladamente el problema o solicitud"
                rows={4}
                defaultValue={selectedTicket?.description}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select name="client_id" defaultValue={selectedTicket?.client_id} required>
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
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select name="priority" defaultValue={selectedTicket?.priority || 'medium'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Crítica</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select name="category" defaultValue={selectedTicket?.category} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="network">Red</SelectItem>
                    <SelectItem value="access">Acceso</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Asignar a</Label>
                <Select name="assigned_to" defaultValue={selectedTicket?.assigned_to || 'unassigned'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {selectedTicket && (
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select name="status" defaultValue={selectedTicket.status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Abierto</SelectItem>
                    <SelectItem value="in_progress">En Progreso</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="resolved">Resuelto</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => {
                  setIsDialogOpen(false)
                  setSelectedTicket(null)
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createTicketMutation.isPending || updateTicketMutation.isPending}
              >
                {(createTicketMutation.isPending || updateTicketMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {selectedTicket ? 'Actualizar Ticket' : 'Crear Ticket'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}