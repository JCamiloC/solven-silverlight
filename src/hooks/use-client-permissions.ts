import { useAuth } from './use-auth'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { resolveEffectiveProfile } from '@/lib/auth/fallback-profile'
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
  const { user, profile, loading, initialized } = useAuth()
  const params = useParams()
  const router = useRouter()

  const effectiveProfile = resolveEffectiveProfile(user, profile)
  const clientId = params.id as string | undefined
  const isClientUser = effectiveProfile?.role === 'cliente'
  const isSupportAgent = effectiveProfile?.role === 'agente_soporte'
  const profileClientId = effectiveProfile?.client_id
  const isOwnClient = Boolean(clientId && profileClientId && profileClientId === clientId)

  const { data: assignedClientIds = [], isLoading: assignmentsLoading } = useSupportAgentClientIds(
    effectiveProfile?.id,
    isSupportAgent
  )

  const isAssignedSupportClient =
    !isSupportAgent || !clientId || assignedClientIds.includes(clientId)

  useEffect(() => {
    if (!initialized || loading) return

    if (isClientUser && clientId) {
      if (!profileClientId) return
      if (isOwnClient) return

      toast.error('No tienes permiso para ver esta información')
      router.replace(`/dashboard/clientes/${profileClientId}`)
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
    initialized,
    loading,
    isClientUser,
    isOwnClient,
    clientId,
    profileClientId,
    router,
    isSupportAgent,
    assignmentsLoading,
    assignedClientIds,
  ])

  const staffCanManage =
    hasFullClientCatalogAccess(effectiveProfile?.role) ||
    (isSupportAgent && isAssignedSupportClient && !assignmentsLoading)

  return {
    isClientUser,
    isSupportAgent,
    isOwnClient,
    isAssignedSupportClient,
    assignedClientIds,
    canEdit: staffCanManage && !isClientUser,
    canDelete: canDeleteClientCompany(effectiveProfile?.role),
    canCreate: canCreateClientCompany(effectiveProfile?.role),
    readOnly: isClientUser,
  }
}
