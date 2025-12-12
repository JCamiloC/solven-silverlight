import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TicketsService, TicketWithRelations } from '@/lib/services/tickets'

const QUERY_KEYS = {
  pendingUpdates: ['tickets', 'pending-updates'] as const,
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
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] })
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
