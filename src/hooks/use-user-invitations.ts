import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserInvitationService, UserInvitation } from '@/lib/services/user-invitations'
import { toast } from 'sonner'

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitation: UserInvitation) => UserInvitationService.inviteUser(invitation),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message)
        // Refrescar la lista de usuarios
        queryClient.invalidateQueries({ queryKey: ['users'] })
        queryClient.invalidateQueries({ queryKey: ['pending-users'] })
      } else {
        toast.error(result.message)
      }
    },
    onError: (error: any) => {
      console.error('Error inviting user:', error)
      toast.error('Error al enviar la invitación')
    }
  })
}

export function useResendInvitation() {
  return useMutation({
    mutationFn: (email: string) => UserInvitationService.resendInvitation(email),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    },
    onError: (error: any) => {
      console.error('Error resending invitation:', error)
      toast.error('Error al reenviar la invitación')
    }
  })
}

export function usePendingUsers() {
  return useQuery({
    queryKey: ['pending-users'],
    queryFn: () => UserInvitationService.getPendingUsers(),
    refetchInterval: 30000 // Refrescar cada 30 segundos
  })
}