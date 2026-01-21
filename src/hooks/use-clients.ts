import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService, ClientInsert, ClientUpdate } from '@/services/clients'
import { Client } from '@/types'
import { toast } from 'sonner'

export const clientKeys = {
  all: ['clients'] as const,
  list: () => [...clientKeys.all, 'list'] as const,
  detail: (id: string) => [...clientKeys.all, 'detail', id] as const,
}

export function useClients() {
  return useQuery({
    queryKey: clientKeys.list(),
    queryFn: clientService.getAll,
    staleTime: 5 * 60 * 1000, // Reducido a 5 minutos para refrescar más frecuente
    refetchOnWindowFocus: true, // Refetch cuando vuelves a la ventana
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => clientService.getById(id),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (client: ClientInsert) => clientService.create(client),
    // Optimistic update: actualizar UI inmediatamente
    onMutate: async (newClient) => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: clientKeys.list() })
      
      // Snapshot del valor anterior
      const previousClients = queryClient.getQueryData<Client[]>(clientKeys.list())
      
      // Optimistically update UI con el nuevo cliente
      if (previousClients) {
        const optimisticClient: Client = {
          id: 'temp-' + Date.now(), // ID temporal
          ...newClient,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          client_type: newClient.client_type || 'no_aplica',
          phone: newClient.phone || undefined,
          address: newClient.address || undefined,
          nit: newClient.nit || undefined,
          mantenimientos_al_anio: newClient.mantenimientos_al_anio || 0,
        }
        
        queryClient.setQueryData<Client[]>(
          clientKeys.list(),
          [...previousClients, optimisticClient]
        )
      }
      
      // Retornar contexto para rollback en caso de error
      return { previousClients }
    },
    onSuccess: async (newClient) => {
      // Invalidar y refetch con datos reales del servidor
      await queryClient.invalidateQueries({ queryKey: clientKeys.list() })
      toast.success('Cliente creado exitosamente')
    },
    onError: (error: Error, newClient, context) => {
      // Rollback en caso de error
      if (context?.previousClients) {
        queryClient.setQueryData(clientKeys.list(), context.previousClients)
      }
      toast.error(`Error al crear cliente: ${error.message}`)
    },
    // Siempre refetch después de error o éxito
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.list() })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ClientUpdate }) => 
      clientService.update(id, updates),
    // Optimistic update para edición
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: clientKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: clientKeys.list() })
      
      const previousClient = queryClient.getQueryData<Client>(clientKeys.detail(id))
      const previousClients = queryClient.getQueryData<Client[]>(clientKeys.list())
      
      // Update detail
      if (previousClient) {
        queryClient.setQueryData<Client>(clientKeys.detail(id), {
          ...previousClient,
          ...updates,
          updated_at: new Date().toISOString(),
        })
      }
      
      // Update list
      if (previousClients) {
        queryClient.setQueryData<Client[]>(
          clientKeys.list(),
          previousClients.map(client =>
            client.id === id
              ? { ...client, ...updates, updated_at: new Date().toISOString() }
              : client
          )
        )
      }
      
      return { previousClient, previousClients }
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.detail(data.id) })
      await queryClient.invalidateQueries({ queryKey: clientKeys.list() })
      toast.success('Cliente actualizado exitosamente')
    },
    onError: (error: Error, { id }, context) => {
      if (context?.previousClient) {
        queryClient.setQueryData(clientKeys.detail(id), context.previousClient)
      }
      if (context?.previousClients) {
        queryClient.setQueryData(clientKeys.list(), context.previousClients)
      }
      toast.error(`Error al actualizar: ${error.message}`)
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: clientKeys.detail(data.id) })
      }
      queryClient.invalidateQueries({ queryKey: clientKeys.list() })
    },
  })
}