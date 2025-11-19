'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Building2 } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useClients } from '@/hooks/use-clients'
import { Client } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ClientesPage() {
  const router = useRouter()
  const { data: clients, isLoading, error } = useClients()
  const [searchTerm, setSearchTerm] = useState('')

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">
              Gestión de clientes y sus recursos
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/usuarios')}>
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
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {columns.map((column) => (
                          <th
                            key={String(column.key)}
                            className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
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
                              ? column.render(value as string | undefined)
                              : String(value || '-')
                            return (
                              <td
                                key={String(column.key)}
                                className="p-4 align-middle"
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
    </ProtectedRoute>
  )
}

