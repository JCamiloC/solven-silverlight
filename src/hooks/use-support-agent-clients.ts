import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  SupportAgentClientsService,
  supportAgentClientKeys,
} from '@/lib/services/support-agent-clients'

export function useSupportAgentClientIds(profileId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: supportAgentClientKeys.byProfile(profileId || ''),
    queryFn: () => SupportAgentClientsService.getClientIdsForProfile(profileId!),
    enabled: Boolean(profileId) && enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useSetSupportAgentClients() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ profileId, clientIds }: { profileId: string; clientIds: string[] }) =>
      SupportAgentClientsService.setClientIdsForProfile(profileId, clientIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: supportAgentClientKeys.byProfile(variables.profileId),
      })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
