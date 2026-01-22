import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TicketsService, Ticket, TicketInsert, TicketUpdate, TicketWithRelations } from '@/lib/services/tickets'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const QUERY_KEYS = {
  tickets: ['tickets'] as const,
  ticket: (id: string) => ['tickets', id] as const,
  stats: ['tickets', 'stats'] as const,
  clientTickets: (clientId: string) => ['tickets', 'client', clientId] as const,
  myTickets: ['tickets', 'my'] as const,
  pendingUpdates: ['tickets', 'pending-updates'] as const,
}

// Hook para obtener todos los tickets
export function useTickets() {
  return useQuery({
    queryKey: QUERY_KEYS.tickets,
    queryFn: () => TicketsService.getAll(),
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: true,
  })
}

// Hook para obtener tickets de un cliente específico
export function useClientTickets(clientId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.clientTickets(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw new Error(`Error al obtener tickets del cliente: ${error.message}`)
      return data as TicketWithRelations[]
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

// Hook para obtener tickets del usuario cliente actual
export function useMyTickets(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.myTickets,
    queryFn: async () => {
      // Primero obtener el client_id del perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', userId)
        .single()

      if (profileError) throw new Error(`Error al obtener perfil: ${profileError.message}`)
      if (!profile?.client_id) return []

      // Luego obtener los tickets de ese cliente
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('client_id', profile.client_id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(`Error al obtener mis tickets: ${error.message}`)
      return data as TicketWithRelations[]
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

// Hook para obtener un ticket específico
export function useTicket(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.ticket(id),
    queryFn: () => TicketsService.getById(id),
    enabled: !!id,
  })
}

// Hook para obtener estadísticas
export function useTicketStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: () => TicketsService.getStats(),
  })
}

// Hook para crear ticket
export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TicketInsert) => TicketsService.create(data),
    onMutate: async (newTicket) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tickets })

      // Snapshot previous value
      const previousTickets = queryClient.getQueryData<TicketWithRelations[]>(QUERY_KEYS.tickets)

      // Optimistically update
      const optimisticTicket: TicketWithRelations = {
        id: `temp-${Date.now()}`,
        ticket_number: `Silver${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000`, // Temporal
        ...newTicket,
        status: newTicket.status || 'open',
        priority: newTicket.priority || 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueryData<TicketWithRelations[]>(
        QUERY_KEYS.tickets,
        (old) => old ? [optimisticTicket, ...old] : [optimisticTicket]
      )

      return { previousTickets }
    },
    onError: (error, newTicket, context) => {
      // Rollback
      queryClient.setQueryData(QUERY_KEYS.tickets, context?.previousTickets)
      toast.error('Error al crear ticket', {
        description: error.message,
      })
    },
    onSuccess: (data) => {
      toast.success('Ticket creado exitosamente', {
        description: `Ticket ${data.ticket_number} ha sido creado`,
      })
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
    },
  })
}

// Hook para actualizar ticket
export function useUpdateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TicketUpdate }) =>
      TicketsService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tickets })
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.ticket(id) })

      // Snapshot previous values
      const previousTickets = queryClient.getQueryData<TicketWithRelations[]>(QUERY_KEYS.tickets)
      const previousTicket = queryClient.getQueryData<TicketWithRelations>(QUERY_KEYS.ticket(id))

      // Optimistically update tickets list
      queryClient.setQueryData<TicketWithRelations[]>(
        QUERY_KEYS.tickets,
        (old) =>
          old?.map((ticket) =>
            ticket.id === id 
              ? { ...ticket, ...data, updated_at: new Date().toISOString() }
              : ticket
          ) || []
      )

      // Optimistically update single ticket
      if (previousTicket) {
        queryClient.setQueryData<TicketWithRelations>(
          QUERY_KEYS.ticket(id),
          { ...previousTicket, ...data, updated_at: new Date().toISOString() }
        )
      }

      return { previousTickets, previousTicket }
    },
    onError: (error, { id }, context) => {
      // Rollback
      queryClient.setQueryData(QUERY_KEYS.tickets, context?.previousTickets)
      queryClient.setQueryData(QUERY_KEYS.ticket(id), context?.previousTicket)
      toast.error('Error al actualizar ticket', {
        description: error.message,
      })
    },
    onSuccess: (data) => {
      toast.success('Ticket actualizado', {
        description: `Ticket ${data.ticket_number} ha sido actualizado`,
      })
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
    },
  })
}

// Hook para eliminar ticket
export function useDeleteTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => TicketsService.delete(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tickets })

      // Snapshot previous value
      const previousTickets = queryClient.getQueryData<TicketWithRelations[]>(QUERY_KEYS.tickets)
      
      // Get ticket to show in success message
      const deletedTicket = previousTickets?.find(t => t.id === id)

      // Optimistically update
      queryClient.setQueryData<TicketWithRelations[]>(
        QUERY_KEYS.tickets,
        (old) => old?.filter((ticket) => ticket.id !== id) || []
      )

      return { previousTickets, deletedTicket }
    },
    onError: (error, id, context) => {
      // Rollback
      queryClient.setQueryData(QUERY_KEYS.tickets, context?.previousTickets)
      toast.error('Error al eliminar ticket', {
        description: error.message,
      })
    },
    onSuccess: (_, id, context) => {
      const ticketNumber = context?.deletedTicket?.ticket_number || `#${id.slice(-8)}`
      toast.success('Ticket eliminado', {
        description: `Ticket ${ticketNumber} ha sido eliminado`,
      })
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
    },
  })
}

// Hook para actualizar solo el status
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Ticket['status'] }) =>
      TicketsService.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tickets })
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.ticket(id) })

      // Snapshot previous values
      const previousTickets = queryClient.getQueryData<TicketWithRelations[]>(QUERY_KEYS.tickets)
      const previousTicket = queryClient.getQueryData<TicketWithRelations>(QUERY_KEYS.ticket(id))

      const updates = {
        status,
        updated_at: new Date().toISOString()
      }

      // Optimistically update tickets list
      queryClient.setQueryData<TicketWithRelations[]>(
        QUERY_KEYS.tickets,
        (old) =>
          old?.map((ticket) =>
            ticket.id === id ? { ...ticket, ...updates } : ticket
          ) || []
      )

      // Optimistically update single ticket
      if (previousTicket) {
        queryClient.setQueryData<TicketWithRelations>(
          QUERY_KEYS.ticket(id),
          { ...previousTicket, ...updates }
        )
      }

      return { previousTickets, previousTicket }
    },
    onError: (error, { id }, context) => {
      // Rollback
      queryClient.setQueryData(QUERY_KEYS.tickets, context?.previousTickets)
      queryClient.setQueryData(QUERY_KEYS.ticket(id), context?.previousTicket)
      toast.error('Error al actualizar estado', {
        description: error.message,
      })
    },
    onSuccess: (data) => {
      const statusLabels: Record<string, string> = {
        open: 'abierto',
        in_progress: 'en revisión',
        pendiente_confirmacion: 'pendiente confirmación',
        resolved: 'resuelto',
        closed: 'cerrado'
      }
      
      toast.success('Estado actualizado', {
        description: `Ticket marcado como ${statusLabels[data.status] || data.status}`,
      })
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
    },
  })
}
/**
 * Hook para obtener tickets con notificaciones pendientes
 */
export function useTicketsWithPendingUpdates() {
  return useQuery({
    queryKey: QUERY_KEYS.pendingUpdates,
    queryFn: () => TicketsService.getWithPendingUpdates(),
    staleTime: 30 * 1000, // 30 segundos - refetch más frecuente para notificaciones
    refetchInterval: 60 * 1000, // Auto refetch cada minuto
  })
}

/**
 * Hook para marcar una actualización como leída
 */
export function useMarkTicketUpdateAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ticketId: string) => TicketsService.markUpdateAsRead(ticketId),
    onSuccess: (_, ticketId) => {
      // Invalidar las queries relevantes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ticket(ticketId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingUpdates })
      
      toast.success('Notificación marcada como leída')
    },
    onError: (error) => {
      toast.error('Error al marcar como leída', {
        description: error.message,
      })
    },
  })
}
