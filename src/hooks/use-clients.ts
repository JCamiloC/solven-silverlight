import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService, ClientInsert, ClientUpdate } from '@/services/clients'
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
    staleTime: 10 * 60 * 1000, // 10 minutes
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.list() })
      toast.success('Cliente creado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(`Error al crear cliente: ${error.message}`)
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ClientUpdate }) => 
      clientService.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: clientKeys.list() })
      toast.success('Cliente actualizado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`)
    },
  })
}