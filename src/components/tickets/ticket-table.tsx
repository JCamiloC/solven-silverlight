"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useClients } from '@/hooks/use-clients'
import { useAssignableUsers } from '@/hooks/use-users'
import type { TicketWithRelations } from '@/lib/services/tickets'

interface TicketTableProps {
  tickets: TicketWithRelations[]
  isLoading?: boolean
  showClientColumn?: boolean
  emptyMessage?: string
}

const statusLabels = {
  open: 'Abierto',
  in_progress: 'En Progreso',
  pending: 'Pendiente',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

const statusColors = {
  open: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  pending: 'bg-orange-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
}

const priorityLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
}

const priorityColors = {
  low: 'bg-green-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

const categoryLabels = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Red',
  access: 'Accesos',
  other: 'Otro',
}

export function TicketTable({
  tickets,
  isLoading = false,
  showClientColumn = true,
  emptyMessage = 'No hay tickets registrados',
}: TicketTableProps) {
  const router = useRouter()
  const { data: clients = [] } = useClients()
  const { data: assignableUsers = [] } = useAssignableUsers()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Cargando tickets...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">ID</TableHead>
                {showClientColumn && (
                  <TableHead className="whitespace-nowrap">Cliente</TableHead>
                )}
                <TableHead className="whitespace-nowrap">Título</TableHead>
                <TableHead className="whitespace-nowrap">Categoría</TableHead>
                <TableHead className="whitespace-nowrap">Prioridad</TableHead>
                <TableHead className="whitespace-nowrap">Estado</TableHead>
                <TableHead className="whitespace-nowrap">Creado</TableHead>
                <TableHead className="whitespace-nowrap">Asignado a</TableHead>
                <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const client = clients.find(c => c.id === ticket.client_id)
                const assignedUser = assignableUsers.find(u => u.id === ticket.assigned_to)
                
                return (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                >
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    #{ticket.id.slice(-8)}
                  </TableCell>
                  {showClientColumn && (
                    <TableCell className="whitespace-nowrap">
                      {client?.name || 'N/A'}
                    </TableCell>
                  )}
                  <TableCell className="max-w-[300px]">
                    <div className="truncate">{ticket.title}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="outline">
                      {categoryLabels[ticket.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge className={priorityColors[ticket.priority]}>
                      {priorityLabels[ticket.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge className={statusColors[ticket.status]}>
                      {statusLabels[ticket.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(ticket.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {assignedUser ? (
                      <span className="text-sm">
                        {assignedUser.first_name} {assignedUser.last_name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/tickets/${ticket.id}`)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
