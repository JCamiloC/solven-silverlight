import { useAuth } from './use-auth'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

/**
 * Hook para gestionar permisos de clientes
 * Valida que un cliente solo acceda a su propia información
 * y proporciona flags para controlar la UI (lectura/escritura)
 */
export function useClientPermissions() {
  const { profile } = useAuth()
  const params = useParams()
  const router = useRouter()
  
  const clientId = params.id as string
  const isClientUser = profile?.role === 'cliente'
  const isOwnClient = profile?.client_id === clientId
  
  // Validar acceso automáticamente solo si es cliente
  useEffect(() => {
    // Solo validar si es usuario cliente Y hay un clientId en la URL
    if (isClientUser && clientId && !isOwnClient) {
      toast.error('No tienes permiso para ver esta información')
      // Redirigir al cliente a su propia página
      if (profile?.client_id) {
        router.push(`/dashboard/clientes/${profile.client_id}`)
      }
    }
  }, [isClientUser, isOwnClient, clientId, profile, router])
  
  return {
    isClientUser,      // Es un usuario con rol cliente
    isOwnClient,       // El cliente está viendo su propia página
    canEdit: !isClientUser,    // Puede editar (staff)
    canDelete: !isClientUser,  // Puede eliminar (staff)
    canCreate: !isClientUser,  // Puede crear (staff)
    readOnly: isClientUser,    // Modo solo lectura (cliente)
  }
}
