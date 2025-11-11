import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TicketCommentsService, TicketCommentWithUser, TicketCommentInsert } from '@/lib/services/ticket-comments'

const QUERY_KEYS = {
  comments: (ticketId: string) => ['ticket-comments', ticketId] as const,
}

// Hook para obtener comentarios de un ticket
export function useTicketComments(ticketId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.comments(ticketId),
    queryFn: () => TicketCommentsService.getByTicketId(ticketId),
    enabled: !!ticketId,
  })
}

// Hook para crear comentario
export function useCreateTicketComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TicketCommentInsert) => TicketCommentsService.create(data),
    onMutate: async (newComment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.comments(newComment.ticket_id) })

      // Snapshot previous value
      const previousComments = queryClient.getQueryData<TicketCommentWithUser[]>(
        QUERY_KEYS.comments(newComment.ticket_id)
      )

      // Optimistically update
      const optimisticComment: TicketCommentWithUser = {
        id: `temp-${Date.now()}`,
        ...newComment,
        is_internal: newComment.is_internal || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: {
          id: newComment.created_by,
          first_name: 'Cargando',
          last_name: '...',
          email: ''
        }
      }

      queryClient.setQueryData<TicketCommentWithUser[]>(
        QUERY_KEYS.comments(newComment.ticket_id),
        (old) => old ? [...old, optimisticComment] : [optimisticComment]
      )

      return { previousComments, ticketId: newComment.ticket_id }
    },
    onError: (error, newComment, context) => {
      // Rollback
      if (context?.previousComments) {
        queryClient.setQueryData(
          QUERY_KEYS.comments(context.ticketId),
          context.previousComments
        )
      }
      toast.error('Error al crear comentario', {
        description: error.message,
      })
    },
    onSuccess: (data) => {
      toast.success('Comentario agregado', {
        description: 'El comentario ha sido agregado exitosamente',
      })
    },
    onSettled: (_, __, variables) => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments(variables.ticket_id) })
    },
  })
}

// Hook para actualizar comentario
export function useUpdateTicketComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, comment, userId, ticketId }: { 
      id: string; 
      comment: string; 
      userId: string;
      ticketId: string;
    }) => TicketCommentsService.update(id, comment, userId),
    onMutate: async ({ id, comment, ticketId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.comments(ticketId) })

      // Snapshot previous value
      const previousComments = queryClient.getQueryData<TicketCommentWithUser[]>(
        QUERY_KEYS.comments(ticketId)
      )

      // Optimistically update
      queryClient.setQueryData<TicketCommentWithUser[]>(
        QUERY_KEYS.comments(ticketId),
        (old) =>
          old?.map((c) =>
            c.id === id 
              ? { ...c, comment, updated_at: new Date().toISOString() }
              : c
          ) || []
      )

      return { previousComments, ticketId }
    },
    onError: (error, { ticketId }, context) => {
      // Rollback
      if (context?.previousComments) {
        queryClient.setQueryData(
          QUERY_KEYS.comments(ticketId),
          context.previousComments
        )
      }
      toast.error('Error al actualizar comentario', {
        description: error.message,
      })
    },
    onSuccess: () => {
      toast.success('Comentario actualizado', {
        description: 'El comentario ha sido actualizado exitosamente',
      })
    },
    onSettled: (_, __, { ticketId }) => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments(ticketId) })
    },
  })
}

// Hook para eliminar comentario
export function useDeleteTicketComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, userId, ticketId }: { 
      id: string; 
      userId: string;
      ticketId: string;
    }) => TicketCommentsService.delete(id, userId),
    onMutate: async ({ id, ticketId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.comments(ticketId) })

      // Snapshot previous value
      const previousComments = queryClient.getQueryData<TicketCommentWithUser[]>(
        QUERY_KEYS.comments(ticketId)
      )

      // Optimistically update
      queryClient.setQueryData<TicketCommentWithUser[]>(
        QUERY_KEYS.comments(ticketId),
        (old) => old?.filter((c) => c.id !== id) || []
      )

      return { previousComments, ticketId }
    },
    onError: (error, { ticketId }, context) => {
      // Rollback
      if (context?.previousComments) {
        queryClient.setQueryData(
          QUERY_KEYS.comments(ticketId),
          context.previousComments
        )
      }
      toast.error('Error al eliminar comentario', {
        description: error.message,
      })
    },
    onSuccess: () => {
      toast.success('Comentario eliminado', {
        description: 'El comentario ha sido eliminado exitosamente',
      })
    },
    onSettled: (_, __, { ticketId }) => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments(ticketId) })
    },
  })
}