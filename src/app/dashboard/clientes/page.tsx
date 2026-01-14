'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Building2, X } from 'lucide-react'
import React from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useClients, useCreateClient } from '@/hooks/use-clients'
import { Client, ClientType } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getClientTypeLabel } from '@/lib/utils/user-type-labels'

export default function ClientesPage() {
  const router = useRouter()
  const { data: clients, isLoading, error } = useClients()
  const { mutate: createClient, isPending: isCreating } = useCreateClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contact_person: '',
    nit: '',
    mantenimientos_al_anio: 0,
    client_type: 'no_aplica' as ClientType,
  })
  const [formError, setFormError] = useState('')

  const filteredClients = clients?.filter((client) => {
    const search = searchTerm.toLowerCase()
    return (
      client.name.toLowerCase().includes(search) ||
      client.email.toLowerCase().includes(search) ||
      client.contact_person.toLowerCase().includes(search) ||
      (client.phone && client.phone.includes(search))
    )
  }) || []

  const columns: Array<{
    key: keyof Client
    label: string
    render?: (value: string | undefined) => string | React.ReactNode
  }> = [
    {
      key: 'name',
      label: 'Nombre',
    },
    {
      key: 'email',
      label: 'Email',
    },
    {
      key: 'contact_person',
      label: 'Contacto',
    },
    {
      key: 'phone',
      label: 'Teléfono',
      render: (value: string | undefined) => value || '-',
    },
    {
      key: 'nit',
      label: 'NIT',
      render: (value: string | undefined) => value || '-',
    },
    {
      key: 'client_type',
      label: 'Tipo de Servicio',
      render: (value: string | undefined) => getClientTypeLabel(value as ClientType),
    },
    {
      key: 'mantenimientos_al_anio',
      label: 'Mantenimientos/año',
      render: (value: string | number | undefined) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && value !== '') return value;
        return '-';
      },
    },
    {
      key: 'created_at',
      label: 'Creado',
      render: (value: string | undefined) => 
        value ? format(new Date(value), 'dd/MM/yyyy', { locale: es }) : '-',
    },
  ]

  const handleRowClick = (client: Client) => {
    router.push(`/dashboard/clientes/${client.id}`)
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-destructive">Error al cargar los clientes</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message || 'Ocurrió un error inesperado'}
            </p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gestión de clientes y sus recursos
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>

        {/* Búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, contacto o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              {filteredClients.length} {filteredClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <Building2 className="h-8 w-8 animate-pulse mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Cargando clientes...</p>
                </div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? 'No se encontraron clientes con ese criterio' : 'No hay clientes registrados'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {columns.map((column) => (
                          <th
                            key={String(column.key)}
                            className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap"
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client) => (
                        <tr
                          key={client.id}
                          className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleRowClick(client)}
                        >
                          {columns.map((column) => {
                            const value = client[column.key]
                            const displayValue = column.render
                              ? column.render(value as any)
                              : String(value || '-')
                            return (
                              <td
                                key={String(column.key)}
                                className="p-4 align-middle whitespace-nowrap"
                              >
                                {displayValue}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Modal para crear nuevo cliente - Mejorado con Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Completa la información del nuevo cliente. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setFormError('')
              
              createClient(formData, {
                onSuccess: () => {
                  setShowCreateDialog(false)
                  setFormData({ 
                    name: '', 
                    email: '', 
                    phone: '', 
                    address: '', 
                    contact_person: '', 
                    nit: '', 
                    mantenimientos_al_anio: 0,
                    client_type: 'no_aplica',
                  })
                },
                onError: (err: Error) => {
                  setFormError(err.message || 'Error al crear cliente')
                },
              })
            }}
            className="space-y-4"
          >
            {formError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Empresa *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Acme Corporation"
                />
              </div>

              {/* NIT */}
              <div className="space-y-2">
                <Label htmlFor="nit">NIT *</Label>
                <Input
                  id="nit"
                  type="text"
                  required
                  value={formData.nit}
                  onChange={e => setFormData({ ...formData, nit: e.target.value })}
                  placeholder="Ej: 900123456-7"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contacto@empresa.com"
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej: +57 300 123 4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Persona de contacto */}
              <div className="space-y-2">
                <Label htmlFor="contact_person">Persona de Contacto *</Label>
                <Input
                  id="contact_person"
                  type="text"
                  required
                  value={formData.contact_person}
                  onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>

              {/* Mantenimientos al año */}
              <div className="space-y-2">
                <Label htmlFor="mantenimientos">Mantenimientos al Año</Label>
                <Input
                  id="mantenimientos"
                  type="number"
                  min={0}
                  value={formData.mantenimientos_al_anio}
                  onChange={e => setFormData({ ...formData, mantenimientos_al_anio: Number(e.target.value) })}
                  placeholder="Ej: 4"
                />
              </div>
            </div>

            {/* Tipo de Servicio */}
            <div className="space-y-2">
              <Label htmlFor="client_type">Tipo de Servicio *</Label>
              <Select
                value={formData.client_type}
                onValueChange={(value: ClientType) => setFormData({ ...formData, client_type: value })}
              >
                <SelectTrigger id="client_type">
                  <SelectValue placeholder="Seleccionar tipo de servicio" />
                </SelectTrigger>
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
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Dirección completa de la empresa"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating}
              >
                {isCreating ? 'Creando...' : 'Crear Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}

