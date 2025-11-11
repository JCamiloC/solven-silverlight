import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  accessCredentialsService, 
  AccessCredentialInsert, 
  AccessCredentialUpdate,
  AccessCredentialWithRelations,
  AccessCredentialDecrypted,
  AccessStats
} from '@/lib/services/access-credentials'
import { useSecurityContext } from '@/components/security/security-provider'
import { useAuth } from '@/hooks/use-auth'

// Query keys para React Query cache management
export const accessKeys = {
  all: ['access-credentials'] as const,
  lists: () => [...accessKeys.all, 'list'] as const,
  list: (filters: string) => [...accessKeys.lists(), { filters }] as const,
  details: () => [...accessKeys.all, 'detail'] as const,
  detail: (id: string) => [...accessKeys.details(), id] as const,
  detailWithPassword: (id: string) => [...accessKeys.all, 'detail-password', id] as const,
  stats: () => [...accessKeys.all, 'stats'] as const,
  byClient: (clientId: string) => [...accessKeys.all, 'client', clientId] as const,
  logs: (credentialId?: string) => [...accessKeys.all, 'logs', credentialId] as const,
}

// Hook para obtener todas las credenciales (sin contraseñas)
export function useAccessCredentials() {
  const { requireVerification } = useSecurityContext()

  return useQuery({
    queryKey: accessKeys.lists(),
    queryFn: async () => {
      // Require 2FA verification before fetching credentials
      const verified = await requireVerification()
      if (!verified) {
        throw new Error('2FA verification required')
      }
      return accessCredentialsService.getAll()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for security
  })
}

// Hook para obtener una credencial específica (sin contraseña)
export function useAccessCredential(id: string) {
  const { requireVerification } = useSecurityContext()

  return useQuery({
    queryKey: accessKeys.detail(id),
    queryFn: async () => {
      if (!id) return null
      
      const verified = await requireVerification()
      if (!verified) {
        throw new Error('2FA verification required')
      }
      
      return accessCredentialsService.getById(id)
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}

// Hook para obtener una credencial CON contraseña (requiere verificación adicional)
export function useAccessCredentialWithPassword(id: string, purpose: string) {
  const { requireVerification } = useSecurityContext()
  const { user } = useAuth()

  return useQuery({
    queryKey: accessKeys.detailWithPassword(id),
    queryFn: async (): Promise<AccessCredentialDecrypted | null> => {
      if (!id || !user?.id) return null
      
      // Always require fresh 2FA verification for password access
      const verified = await requireVerification()
      if (!verified) {
        throw new Error('2FA verification required for password access')
      }
      
      return accessCredentialsService.getWithPassword(id, user.id, purpose)
    },
    enabled: false, // Never auto-fetch, must be manually triggered
    staleTime: 0, // Never cache passwords
    gcTime: 0, // Immediately remove from cache
  })
}

// Hook para obtener estadísticas de accesos
export function useAccessStats() {
  const { hasRole } = useAuth()
  
  // Solo los administradores pueden ver estadísticas de accesos
  const isAdmin = hasRole(['administrador'])
  
  return useQuery({
    queryKey: accessKeys.stats(),
    queryFn: async () => {
      if (!isAdmin) {
        return { total: 0, active: 0, inactive: 0 } as AccessStats
      }
      
      return accessCredentialsService.getStats()
    },
    enabled: isAdmin, // Solo ejecutar si es admin
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook para obtener credenciales por cliente
export function useAccessCredentialsByClient(clientId: string) {
  const { requireVerification } = useSecurityContext()

  return useQuery({
    queryKey: accessKeys.byClient(clientId),
    queryFn: async () => {
      if (!clientId) return []
      
      const verified = await requireVerification()
      if (!verified) {
        throw new Error('2FA verification required')
      }
      
      return accessCredentialsService.getByClient(clientId)
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  })
}

// Hook para obtener logs de acceso
export function useAccessLogs(credentialId?: string) {
  const { requireVerification } = useSecurityContext()

  return useQuery({
    queryKey: accessKeys.logs(credentialId),
    queryFn: async () => {
      const verified = await requireVerification()
      if (!verified) {
        throw new Error('2FA verification required')
      }
      
      if (credentialId) {
        return accessCredentialsService.getAccessLogs(credentialId)
      } else {
        return accessCredentialsService.getAllAccessLogs()
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute for audit logs
  })
}

// Hook para crear nueva credencial
export function useCreateAccessCredential() {
  const queryClient = useQueryClient()
  const { requireVerification } = useSecurityContext()

  return useMutation({
    mutationFn: async (data: AccessCredentialInsert) => {
      // Require 2FA verification before creating credentials
      const verified = await requireVerification()
      if (!verified) {
        throw new Error('2FA verification required')
      }

      // Validate password strength
      const validation = accessCredentialsService.validatePasswordStrength(data.password)
      if (!validation.isStrong) {
        throw new Error(`Contraseña débil: ${validation.feedback.join(', ')}`)
      }

      return accessCredentialsService.create(data)
    },
    onMutate: async (newCredential) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: accessKeys.lists() })

      // Snapshot the previous value
      const previousCredentials = queryClient.getQueryData(accessKeys.lists())

      // Optimistically update (without password for security)
      queryClient.setQueryData(accessKeys.lists(), (old: AccessCredentialWithRelations[] | undefined) => {
        if (!old) return []
        
        const optimisticCredential = {
          id: `temp-${Date.now()}`,
          ...newCredential,
          password: undefined, // Never store password in cache
          status: newCredential.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as AccessCredentialWithRelations

        return [optimisticCredential, ...old]
      })

      return { previousCredentials }
    },
    onError: (err, newCredential, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCredentials) {
        queryClient.setQueryData(accessKeys.lists(), context.previousCredentials)
      }
      toast.error('Error al crear la credencial: ' + (err as Error).message)
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: accessKeys.lists() })
      queryClient.invalidateQueries({ queryKey: accessKeys.stats() })
      toast.success('Credencial creada exitosamente')
    },
  })
}

// Hook para actualizar credencial
export function useUpdateAccessCredential() {
  const queryClient = useQueryClient()
  const { requireVerification } = useSecurityContext()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AccessCredentialUpdate }) => {
      // Require 2FA verification before updating credentials
      const verified = await requireVerification()
      if (!verified) {
        throw new Error('2FA verification required')
      }

      // Validate password strength if password is being updated
      if (data.password) {
        const validation = accessCredentialsService.validatePasswordStrength(data.password)
        if (!validation.isStrong) {
          throw new Error(`Contraseña débil: ${validation.feedback.join(', ')}`)
        }
      }

      return accessCredentialsService.update(id, data)
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: accessKeys.lists() })
      await queryClient.cancelQueries({ queryKey: accessKeys.detail(id) })

      // Snapshot the previous values
      const previousCredentials = queryClient.getQueryData(accessKeys.lists())
      const previousCredential = queryClient.getQueryData(accessKeys.detail(id))

      // Optimistically update the lists (without password)
      queryClient.setQueryData(accessKeys.lists(), (old: AccessCredentialWithRelations[] | undefined) => {
        if (!old) return []
        return old.map(credential => {
          if (credential.id === id) {
            const { password, ...updateData } = data
            return { ...credential, ...updateData, updated_at: new Date().toISOString() }
          }
          return credential
        })
      })

      // Optimistically update the detail (without password)
      queryClient.setQueryData(accessKeys.detail(id), (old: AccessCredentialWithRelations | undefined) => {
        if (!old) return old
        const { password, ...updateData } = data
        return { ...old, ...updateData, updated_at: new Date().toISOString() }
      })

      return { previousCredentials, previousCredential }
    },
    onError: (err, { id }, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousCredentials) {
        queryClient.setQueryData(accessKeys.lists(), context.previousCredentials)
      }
      if (context?.previousCredential) {
        queryClient.setQueryData(accessKeys.detail(id), context.previousCredential)
      }
      toast.error('Error al actualizar la credencial: ' + (err as Error).message)
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: accessKeys.lists() })
      queryClient.invalidateQueries({ queryKey: accessKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: accessKeys.stats() })
      toast.success('Credencial actualizada exitosamente')
    },
  })
}

// Hook para eliminar credencial
export function useDeleteAccessCredential() {
  const queryClient = useQueryClient()
  const { requireVerification } = useSecurityContext()

  return useMutation({
    mutationFn: async (id: string) => {
      // Require 2FA verification before deleting credentials
      const verified = await requireVerification()
      if (!verified) {
        throw new Error('2FA verification required')
      }

      return accessCredentialsService.delete(id)
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: accessKeys.lists() })

      // Snapshot the previous value
      const previousCredentials = queryClient.getQueryData(accessKeys.lists())

      // Optimistically update to remove the credential
      queryClient.setQueryData(accessKeys.lists(), (old: AccessCredentialWithRelations[] | undefined) => {
        if (!old) return []
        return old.filter(credential => credential.id !== id)
      })

      return { previousCredentials }
    },
    onError: (err, id, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousCredentials) {
        queryClient.setQueryData(accessKeys.lists(), context.previousCredentials)
      }
      toast.error('Error al eliminar la credencial: ' + (err as Error).message)
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: accessKeys.lists() })
      queryClient.invalidateQueries({ queryKey: accessKeys.stats() })
      toast.success('Credencial eliminada exitosamente')
    },
  })
}

// Hook para revelar contraseña de forma segura
export function useRevealPassword() {
  const queryClient = useQueryClient()
  const { requireVerification } = useSecurityContext()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, purpose }: { id: string; purpose: string }) => {
      if (!user?.id) throw new Error('Usuario no autenticado')

      // Always require fresh 2FA verification for password reveal
      const verified = await requireVerification()
      if (!verified) {
        throw new Error('2FA verification required')
      }

      const credential = await accessCredentialsService.getWithPassword(id, user.id, purpose)
      
      // Clear the password from memory after a short time
      setTimeout(() => {
        queryClient.removeQueries({ queryKey: accessKeys.detailWithPassword(id) })
      }, 30000) // 30 seconds

      return credential
    },
    onSuccess: () => {
      // Invalidate stats to update access counts
      queryClient.invalidateQueries({ queryKey: accessKeys.stats() })
      toast.success('Contraseña revelada temporalmente')
    },
    onError: (err) => {
      toast.error('Error al revelar contraseña: ' + (err as Error).message)
    },
  })
}