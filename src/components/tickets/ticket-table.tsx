"use client"
import { useState, useMemo } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
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
  in_progress: 'Abierto',
  pendiente_confirmacion: 'Pendiente Confirmación',
  solucionado: 'Solucionado',
  resolved: 'Solucionado',
  closed: 'Solucionado',
}

const statusColors = {
  open: 'bg-blue-500',
  in_progress: 'bg-blue-500',
  pendiente_confirmacion: 'bg-orange-500',
  solucionado: 'bg-green-500',
  resolved: 'bg-green-500',
  closed: 'bg-green-500',
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

  // Estados para filtros y paginaci\u00f3n
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const itemsPerPage = 10

  // Filtrar tickets
  const filteredTickets = useMemo(() => {
    let filtered = [...tickets]

    // Filtrar por cliente
    if (selectedClient && selectedClient !== 'all') {
      filtered = filtered.filter(t => t.client_id === selectedClient)
    }

    // Filtrar por rango de fechas
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      filtered = filtered.filter(t => new Date(t.created_at) >= start)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter(t => new Date(t.created_at) <= end)
    }

    return filtered
  }, [tickets, selectedClient, startDate, endDate])

  // Paginaci\u00f3n
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage)
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Resetear p\u00e1gina al cambiar filtros
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  const handleClientChange = (value: string) => {
    setSelectedClient(value)
    handleFilterChange()
  }

  const handleDateChange = () => {
    handleFilterChange()
  }

  const clearFilters = () => {
    setSelectedClient('all')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

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

  if (filteredTickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filtros</CardTitle>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* (mismo c\u00f3digo de filtros) */}
            {showClientColumn && (
              <div className="space-y-2">
                <Label htmlFor="client-filter">Cliente</Label>
                <Select value={selectedClient} onValueChange={handleClientChange}>
                  <SelectTrigger id="client-filter">
                    <SelectValue placeholder="Todos los clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clientes</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="start-date">Desde</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  handleDateChange()
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Hasta</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  handleDateChange()
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hay tickets que coincidan con los filtros</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {/* Filtros */}
      <CardHeader>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" />
          <CardTitle className="text-base">Filtros</CardTitle>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Filtro por Cliente */}
          {showClientColumn && (
            <div className="space-y-2">
              <Label htmlFor="client-filter">Cliente</Label>
              <Select value={selectedClient} onValueChange={handleClientChange}>
                <SelectTrigger id="client-filter">
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fecha Inicio */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Desde</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                handleDateChange()
              }}
            />
          </div>

          {/* Fecha Fin */}
          <div className="space-y-2">
            <Label htmlFor="end-date">Hasta</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                handleDateChange()
              }}
            />
          </div>

          {/* Bot\u00f3n Limpiar */}
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button variant="outline" onClick={clearFilters} className="w-full">
              Limpiar Filtros
            </Button>
          </div>
        </div>
        <CardDescription className="mt-2">
          Mostrando {filteredTickets.length} de {tickets.length} tickets
        </CardDescription>
      </CardHeader>

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
              {paginatedTickets.map((ticket) => {
                const client = clients.find(c => c.id === ticket.client_id)
                const assignedUser = assignableUsers.find(u => u.id === ticket.assigned_to)
                
                return (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                >
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {ticket.ticket_number || `#${ticket.id.slice(-8)}`}
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

        {/* Paginaci\u00f3n */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              P\u00e1gina {currentPage} de {totalPages} | Mostrando {paginatedTickets.length} de {filteredTickets.length} resultados
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
