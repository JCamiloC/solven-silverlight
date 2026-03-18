import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CreateClientVisitInput, visitasService } from '@/services/visitas'

export const visitasKeys = {
  all: ['visitas'] as const,
  list: () => [...visitasKeys.all, 'list'] as const,
  byClient: (clientId: string) => [...visitasKeys.all, 'client', clientId] as const,
}

export function useAllClientVisits() {
  return useQuery({
    queryKey: visitasKeys.list(),
    queryFn: () => visitasService.listAll(),
    staleTime: 60 * 1000,
  })
}

export function useClientVisits(clientId: string) {
  return useQuery({
    queryKey: visitasKeys.byClient(clientId),
    queryFn: () => visitasService.listByClient(clientId),
    enabled: !!clientId,
    staleTime: 60 * 1000,
  })
}

export function useCreateClientVisit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateClientVisitInput) => visitasService.createVisit(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: visitasKeys.byClient(variables.clientId) })
      toast.success('Visita registrada exitosamente')
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar visita: ${error.message}`)
    },
  })
}
