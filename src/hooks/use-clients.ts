import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.list() });
    },
  });
}
import { clientService } from '@/services/clients'

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