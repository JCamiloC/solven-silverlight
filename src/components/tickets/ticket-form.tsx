"use client"

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useClients } from '@/hooks/use-clients'
import { useAssignableUsers } from '@/hooks/use-users'
import { useCreateTicket, useUpdateTicket } from '@/hooks/use-tickets'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

const ticketFormSchema = z.object({
  client_id: z.string().min(1, 'Cliente es obligatorio'),
  title: z.string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(200, 'El título no puede exceder 200 caracteres'),
  description: z.string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(2000, 'La descripción no puede exceder 2000 caracteres'),
  category: z.enum(['hardware', 'software', 'network', 'access', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed']).optional(),
  assigned_to: z.string().optional(),
})

type TicketFormValues = z.infer<typeof ticketFormSchema>

interface TicketFormProps {
  mode?: 'create' | 'edit'
  ticketId?: string
  initialData?: Partial<TicketFormValues>
  clientId?: string
  clientName?: string
  onSuccess?: (ticketId: string) => void
  redirectUrl?: string
}

const categoryLabels = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Red/Conectividad',
  access: 'Accesos/Credenciales',
  other: 'Otro',
}

const priorityLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
}

const statusLabels = {
  open: 'Abierto',
  in_progress: 'En Progreso',
  pending: 'Pendiente',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

export function TicketForm({ 
  mode = 'create',
  ticketId,
  initialData,
  clientId, 
  clientName, 
  onSuccess, 
  redirectUrl 
}: TicketFormProps) {
  const router = useRouter()
  const { user, isAdmin, isLeader, isSupport } = useAuth()
  const { data: clients, isLoading: loadingClients } = useClients()
  const { data: assignableUsers, isLoading: loadingUsers } = useAssignableUsers()
  const createTicket = useCreateTicket()
  const updateTicket = useUpdateTicket()

  const isClientLocked = !!clientId
  const isEditMode = mode === 'edit'
  const canChangeStatus = isAdmin() || isLeader() || isSupport()

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: initialData || {
      client_id: clientId || '',
      title: '',
      description: '',
      category: 'other',
      priority: 'medium',
      status: 'open',
      assigned_to: undefined,
    },
  })

  // Actualizar client_id si cambia el prop
  useEffect(() => {
    if (clientId) {
      form.setValue('client_id', clientId)
    }
  }, [clientId, form])

  // Cargar datos iniciales en modo edición
  useEffect(() => {
    if (isEditMode && initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        form.setValue(key as keyof TicketFormValues, value)
      })
    }
  }, [isEditMode, initialData, form])

  const onSubmit = async (data: TicketFormValues) => {
    if (!user?.id) return

    try {
      if (isEditMode && ticketId) {
        // Modo edición
        const updates: any = {
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          assigned_to: data.assigned_to || undefined,
        }

        // Solo permitir cambiar estado si tiene permisos
        if (canChangeStatus && data.status) {
          updates.status = data.status
          // Si se marca como resuelto, agregar timestamp
          if (data.status === 'resolved') {
            updates.resolved_at = new Date().toISOString()
          }
        }

        const updatedTicket = await updateTicket.mutateAsync({
          id: ticketId,
          data: updates,
        })

        // Callback personalizado o redirección
        if (onSuccess) {
          onSuccess(updatedTicket.id)
        } else if (redirectUrl) {
          router.push(redirectUrl)
        } else {
          router.push('/dashboard/tickets')
        }
      } else {
        // Modo creación
        const newTicket = await createTicket.mutateAsync({
          client_id: data.client_id,
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          assigned_to: data.assigned_to || undefined,
          created_by: user.id,
        })

        // Callback personalizado o redirección
        if (onSuccess) {
          onSuccess(newTicket.id)
        } else if (redirectUrl) {
          router.push(redirectUrl)
        } else {
          router.push('/dashboard/tickets')
        }
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} ticket:`, error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Información del Ticket */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Ticket</CardTitle>
            <CardDescription>
              {isEditMode 
                ? 'Modifica los detalles del ticket de soporte'
                : 'Complete los detalles del ticket de soporte'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cliente */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    {isClientLocked ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={clientName || 'Cliente'}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    ) : (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={loadingClients}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Breve descripción del problema" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describa el problema en detalle..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoría, Prioridad y Estado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Categoría */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prioridad */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione prioridad" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(priorityLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estado (solo en modo edición y con permisos) */}
              {isEditMode && canChangeStatus && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado *</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Asignar a (opcional) */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignar a (opcional)</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value === 'unassigned' ? undefined : value)
                      }}
                      defaultValue={field.value || 'unassigned'}
                      disabled={loadingUsers}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Sin asignar</SelectItem>
                        {assignableUsers?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createTicket.isPending || updateTicket.isPending}
            className="w-full sm:w-auto"
          >
            {(createTicket.isPending || updateTicket.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditMode 
              ? (updateTicket.isPending ? 'Actualizando...' : 'Actualizar Ticket')
              : (createTicket.isPending ? 'Creando...' : 'Crear Ticket')
            }
          </Button>
        </div>
      </form>
    </Form>
  )
}
