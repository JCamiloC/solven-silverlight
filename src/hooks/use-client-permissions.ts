import { useAuth } from './use-auth'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import {
  canCreateClientCompany,
  canDeleteClientCompany,
  hasFullClientCatalogAccess,
} from '@/lib/auth/staff-client-access'
import { useSupportAgentClientIds } from '@/hooks/use-support-agent-clients'

/**
 * Hook para gestionar permisos de clientes
 * Valida que un cliente solo acceda a su propia información
 * y que el agente de soporte solo vea empresas asignadas.
 */
export function useClientPermissions() {
  const { profile } = useAuth()
  const params = useParams()
  const router = useRouter()

  const clientId = params.id as string
  const isClientUser = profile?.role === 'cliente'
  const isSupportAgent = profile?.role === 'agente_soporte'
  const isOwnClient = profile?.client_id === clientId

  const { data: assignedClientIds = [], isLoading: assignmentsLoading } = useSupportAgentClientIds(
    profile?.id,
    isSupportAgent
  )

  const isAssignedSupportClient =
    !isSupportAgent || !clientId || assignedClientIds.includes(clientId)

  useEffect(() => {
    if (isClientUser && clientId && !isOwnClient) {
      toast.error('No tienes permiso para ver esta información')
      if (profile?.client_id) {
        router.push(`/dashboard/clientes/${profile.client_id}`)
      }
      return
    }

    if (
      isSupportAgent &&
      clientId &&
      !assignmentsLoading &&
      assignedClientIds.length > 0 &&
      !assignedClientIds.includes(clientId)
    ) {
      toast.error('No tienes asignada esta empresa')
      router.push('/dashboard/clientes')
    }

    if (isSupportAgent && clientId && !assignmentsLoading && assignedClientIds.length === 0) {
      toast.error('No tienes empresas asignadas. Contacta a un administrador.')
      router.push('/dashboard/clientes')
    }
  }, [
    isClientUser,
    isOwnClient,
    clientId,
    profile,
    router,
    isSupportAgent,
    assignmentsLoading,
    assignedClientIds,
  ])

  const staffCanManage =
    hasFullClientCatalogAccess(profile?.role) ||
    (isSupportAgent && isAssignedSupportClient && !assignmentsLoading)

  return {
    isClientUser,
    isSupportAgent,
    isOwnClient,
    isAssignedSupportClient,
    assignedClientIds,
    canEdit: staffCanManage && !isClientUser,
    canDelete: canDeleteClientCompany(profile?.role),
    canCreate: canCreateClientCompany(profile?.role),
    readOnly: isClientUser,
  }
}
