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
import { ProtectedRoute } from '@/components/auth/protected-route'
import { LoadingLink } from '@/components/ui/loading-link'
import { InfoField } from '@/components/ui/info-field'
import { useClient, useUpdateClient } from '@/hooks/use-clients'
import { useClientPermissions } from '@/hooks/use-client-permissions'
import { useQuery } from '@tanstack/react-query'
import { clientService } from '@/services/clients'
import { toast } from 'sonner'
import { Loading } from '@/components/ui/loading'
import { Users, Mail, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ClientType } from '@/types'
import { getClientTypeLabel, getClientTypeBadgeVariant } from '@/lib/utils/user-type-labels'

const clientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  address: z.string().optional(),
  contact_person: z.string().min(1, 'La persona de contacto es requerida'),
  nit: z.string().min(1, 'El NIT es requerido'),
  mantenimientos_al_anio: z.coerce.number().min(0, 'Debe ser un número positivo'),
  client_type: z.enum([
    'on_demand_software',
    'on_demand_hardware',
    'on_demand_ambos',
    'contrato_software',
    'contrato_hardware',
    'contrato_ambos',
    'no_aplica'
  ]).optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

export default function ClienteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  
  // Hook de permisos para clientes (valida acceso automáticamente)
  const { isClientUser, readOnly, canEdit } = useClientPermissions()
  
  const { data: client, isLoading, error } = useClient(clientId)
  const updateClient = useUpdateClient()
  
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
      client_type: 'no_aplica',
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
      client_type: client.client_type || 'no_aplica',
    })
  }

  const onSubmit = async (data: ClientFormData) => {
    updateClient.mutate({ id: clientId, updates: data })
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" text="Cargando cliente..." />
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !client) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-destructive">Error al cargar el cliente</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {error?.message || 'Cliente no encontrado'}
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push(isClientUser ? `/dashboard/clientes/${clientId}` : '/dashboard/clientes')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
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
      description: 'Aplicaciones personalizadas',
      icon: Code,
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
      title: 'Tickets',
      description: 'Ver tickets del cliente',
      icon: Ticket,
      href: `/dashboard/clientes/${clientId}/tickets`,
      color: 'bg-red-500 hover:bg-red-600',
    },
  ]

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {!isClientUser && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard/clientes')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{client.name}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isClientUser ? 'Información de mi empresa' : 'Gestión de recursos del cliente'}
              </p>
            </div>
          </div>
        </div>

        {/* Datos Básicos - Vista Condicional */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Básicos</CardTitle>
            <CardDescription>
              {isClientUser 
                ? 'Información de tu empresa. Si necesitas actualizar estos datos, contacta a soporte.'
                : 'Información del cliente. Puedes editar estos datos y guardar los cambios.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isClientUser ? (
              /* Vista de solo lectura para clientes */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Nombre de la Empresa" value={client.name} />
                  <InfoField label="Email" value={client.email} />
                  <InfoField label="NIT" value={client.nit} />
                  <InfoField label="Mantenimientos al año" value={client.mantenimientos_al_anio} />
                  <InfoField label="Teléfono" value={client.phone} />
                  <InfoField label="Persona de Contacto" value={client.contact_person} />
                  <div className="md:col-span-2">
                    <InfoField 
                      label="Tipo de Servicio" 
                      value={getClientTypeLabel(client.client_type as ClientType)} 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <InfoField label="Dirección" value={client.address} />
                  </div>
                </div>
              </div>
            ) : (
              /* Formulario editable para staff (sin cambios) */
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
                  name="client_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Servicio</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo de servicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="on_demand_software">On demand - Software</SelectItem>
                          <SelectItem value="on_demand_hardware">On demand - Hardware</SelectItem>
                          <SelectItem value="on_demand_ambos">On demand - Ambos</SelectItem>
                          <SelectItem value="contrato_software">Contrato - Software</SelectItem>
                          <SelectItem value="contrato_hardware">Contrato - Hardware</SelectItem>
                          <SelectItem value="contrato_ambos">Contrato - Ambos</SelectItem>
                          <SelectItem value="no_aplica">No Aplica</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    disabled={updateClient.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateClient.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </Form>
            )}
          </CardContent>
        </Card>

        {/* Usuarios Asociados - Solo para staff */}
        {!isClientUser && (
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
        )}

        {/* Botones de Navegación */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {isClientUser ? 'Mis Recursos' : 'Recursos del Cliente'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {navigationButtons.map((button) => {
              const Icon = button.icon
              return (
                <LoadingLink
                  key={button.title}
                  href={button.href}
                  className="block"
                  showSpinner={false}
                >
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
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
                </LoadingLink>
              )
            })}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

