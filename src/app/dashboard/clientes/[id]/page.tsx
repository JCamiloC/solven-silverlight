'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  HardDrive, 
  Monitor, 
  Key, 
  Ticket, 
  Code,
  Save,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useClient } from '@/hooks/use-clients'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { clientService } from '@/services/clients'
import { clientKeys } from '@/hooks/use-clients'
import { toast } from 'sonner'
import { Loading } from '@/components/ui/loading'
import { Users, Mail, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserType } from '@/types'
import { getUserTypeLabel, getUserTypeBadgeVariant } from '@/lib/utils/user-type-labels'

const clientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  address: z.string().optional(),
  contact_person: z.string().min(1, 'La persona de contacto es requerida'),
  nit: z.string().min(1, 'El NIT es requerido'),
  mantenimientos_al_anio: z.coerce.number().min(0, 'Debe ser un número positivo'),
})

type ClientFormData = z.infer<typeof clientSchema>

export default function ClienteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const queryClient = useQueryClient()
  
  const { data: client, isLoading, error } = useClient(clientId)
  
  // Obtener usuarios del cliente
  const { data: clientUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['clients', clientId, 'users'],
    queryFn: () => clientService.getUsersByClientId(clientId),
    enabled: !!clientId,
  })

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema) as Resolver<ClientFormData>,
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      contact_person: '',
      nit: '',
      mantenimientos_al_anio: 0,
    },
  })

  // Actualizar valores del formulario cuando se carga el cliente
  if (client && form.getValues('name') === '') {
    form.reset({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      address: client.address || '',
      contact_person: client.contact_person,
      nit: client.nit || '',
      mantenimientos_al_anio: client.mantenimientos_al_anio ?? 0,
    })
  }

  const updateMutation = useMutation({
    mutationFn: (data: ClientFormData) => clientService.update(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(clientId) })
      queryClient.invalidateQueries({ queryKey: clientKeys.list() })
      toast.success('Cliente actualizado correctamente')
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`)
    },
  })

  const onSubmit = async (data: ClientFormData) => {
    try {
      await updateMutation.mutateAsync(data)
    } catch (error) {
      console.error('Error updating client:', error)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" text="Cargando cliente..." />
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !client) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-destructive">Error al cargar el cliente</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {error?.message || 'Cliente no encontrado'}
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push('/dashboard/clientes')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Clientes
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const navigationButtons = [
    {
      title: 'Hardware',
      description: 'Ver y gestionar equipos',
      icon: HardDrive,
      href: `/dashboard/clientes/${clientId}/hardware`,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Software',
      description: 'Ver y gestionar licencias',
      icon: Monitor,
      href: `/dashboard/clientes/${clientId}/software`,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Accesos',
      description: 'Ver y gestionar credenciales',
      icon: Key,
      href: `/dashboard/clientes/${clientId}/accesos`,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: 'Aplicativos',
      description: 'Ver y gestionar aplicativos',
      icon: Code,
      href: `/dashboard/clientes/${clientId}/aplicativos`,
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      title: 'Tickets',
      description: 'Ver tickets del cliente',
      icon: Ticket,
      href: `/dashboard/clientes/${clientId}/tickets`,
      color: 'bg-red-500 hover:bg-red-600',
    },
  ]

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/clientes')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
              <p className="text-muted-foreground">
                Gestión de recursos del cliente
              </p>
            </div>
          </div>
        </div>

        {/* Datos Básicos Editables */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Básicos</CardTitle>
            <CardDescription>
              Información del cliente. Puedes editar estos datos y guardar los cambios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre de la empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIT</FormLabel>
                        <FormControl>
                          <Input placeholder="NIT de la empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mantenimientos_al_anio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mantenimientos al año</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} placeholder="Cantidad anual" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="+57 300 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persona de Contacto</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Dirección completa de la empresa"
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Usuarios Asociados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios Asociados
            </CardTitle>
            <CardDescription>
              Usuarios asignados a esta empresa cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loading size="sm" text="Cargando usuarios..." />
              </div>
            ) : clientUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay usuarios asignados a este cliente</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/dashboard/usuarios')}
                >
                  Agregar Usuario
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {clientUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold">
                            {user.first_name[0]}{user.last_name[0]}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                          {user.user_type && (
                            <Badge variant={getUserTypeBadgeVariant(user.user_type)} className="text-xs">
                              {getUserTypeLabel(user.user_type)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/usuarios`)}
                    >
                      Ver
                    </Button>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/dashboard/usuarios')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Gestionar Usuarios
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botones de Navegación */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recursos del Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {navigationButtons.map((button) => {
              const Icon = button.icon
              return (
                <Card 
                  key={button.title}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(button.href)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`${button.color} p-3 rounded-lg text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{button.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {button.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

