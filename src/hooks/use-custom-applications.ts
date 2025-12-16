import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  customApplicationsService,
  CustomApplicationInsert,
  CustomApplicationUpdate,
  CustomApplicationWithRelations,
  CustomApplicationStats,
  CustomAppFollowupInsert,
} from '@/lib/services/custom-applications'
import { CustomAppFollowup } from '@/types'

// ===================================
// QUERY KEYS
// ===================================

export const customAppsKeys = {
  all: ['customApplications'] as const,
  lists: () => [...customAppsKeys.all, 'list'] as const,
  details: () => [...customAppsKeys.all, 'detail'] as const,
  detail: (id: string) => [...customAppsKeys.details(), id] as const,
  stats: () => [...customAppsKeys.all, 'stats'] as const,
  byClient: (clientId: string) => [...customAppsKeys.all, 'client', clientId] as const,
  followups: (appId: string) => [...customAppsKeys.all, 'followups', appId] as const,
}

// ===================================
// QUERIES
// ===================================

// Obtener todas las aplicaciones
export function useCustomApplications() {
  return useQuery({
    queryKey: customAppsKeys.lists(),
    queryFn: customApplicationsService.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Obtener aplicación por ID
export function useCustomApplication(id: string) {
  return useQuery({
    queryKey: customAppsKeys.detail(id),
    queryFn: () => customApplicationsService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// Obtener estadísticas
export function useCustomApplicationsStats(clientId?: string) {
  return useQuery({
    queryKey: clientId ? [...customAppsKeys.stats(), clientId] : customAppsKeys.stats(),
    queryFn: () => customApplicationsService.getStats(clientId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Obtener aplicaciones por cliente
export function useCustomApplicationsByClient(clientId: string) {
  return useQuery({
    queryKey: customAppsKeys.byClient(clientId),
    queryFn: () => customApplicationsService.getByClient(clientId),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  })
}

// Obtener seguimientos
export function useCustomAppFollowups(applicationId: string) {
  return useQuery({
    queryKey: customAppsKeys.followups(applicationId),
    queryFn: () => customApplicationsService.getFollowups(applicationId),
    enabled: !!applicationId,
    staleTime: 2 * 60 * 1000,
  })
}

// ===================================
// MUTATIONS
// ===================================

// Crear aplicación
export function useCreateCustomApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CustomApplicationInsert) => customApplicationsService.create(data),
    onMutate: async (newApp) => {
      await queryClient.cancelQueries({ queryKey: customAppsKeys.lists() })
      const previousApps = queryClient.getQueryData(customAppsKeys.lists())

      queryClient.setQueryData(customAppsKeys.lists(), (old: CustomApplicationWithRelations[] | undefined) => {
        if (!old) return []
        
        const optimisticApp = {
          id: `temp-${Date.now()}`,
          ...newApp,
          status: newApp.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as CustomApplicationWithRelations

        return [optimisticApp, ...old]
      })

      return { previousApps }
    },
    onError: (err, newApp, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(customAppsKeys.lists(), context.previousApps)
      }
      toast.error('Error al crear la aplicación: ' + (err as Error).message)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: customAppsKeys.stats() })
      // Invalidar queries por cliente
      if (data.client_id) {
        queryClient.invalidateQueries({ queryKey: customAppsKeys.byClient(data.client_id) })
      }
      toast.success('Aplicación creada exitosamente')
    },
  })
}

// Actualizar aplicación
export function useUpdateCustomApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomApplicationUpdate }) =>
      customApplicationsService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: customAppsKeys.lists() })
      await queryClient.cancelQueries({ queryKey: customAppsKeys.detail(id) })

      const previousApps = queryClient.getQueryData(customAppsKeys.lists())
      const previousApp = queryClient.getQueryData(customAppsKeys.detail(id))

      queryClient.setQueryData(customAppsKeys.lists(), (old: CustomApplicationWithRelations[] | undefined) => {
        if (!old) return []
        return old.map(app => {
          if (app.id === id) {
            return { ...app, ...data, updated_at: new Date().toISOString() }
          }
          return app
        })
      })

      queryClient.setQueryData(customAppsKeys.detail(id), (old: CustomApplicationWithRelations | undefined) => {
        if (!old) return old
        return { ...old, ...data, updated_at: new Date().toISOString() }
      })

      return { previousApps, previousApp }
    },
    onError: (err, { id }, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(customAppsKeys.lists(), context.previousApps)
      }
      if (context?.previousApp) {
        queryClient.setQueryData(customAppsKeys.detail(id), context.previousApp)
      }
      toast.error('Error al actualizar la aplicación: ' + (err as Error).message)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: customAppsKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: customAppsKeys.stats() })
      // Invalidar queries por cliente
      if (data.client_id) {
        queryClient.invalidateQueries({ queryKey: customAppsKeys.byClient(data.client_id) })
      }
      toast.success('Aplicación actualizada exitosamente')
    },
  })
}

// Eliminar aplicación
export function useDeleteCustomApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => customApplicationsService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: customAppsKeys.lists() })
      const previousApps = queryClient.getQueryData(customAppsKeys.lists())

      queryClient.setQueryData(customAppsKeys.lists(), (old: CustomApplicationWithRelations[] | undefined) => {
        if (!old) return []
        return old.filter(app => app.id !== id)
      })

      return { previousApps }
    },
    onError: (err, id, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(customAppsKeys.lists(), context.previousApps)
      }
      toast.error('Error al eliminar la aplicación: ' + (err as Error).message)
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: customAppsKeys.stats() })
      // Invalidar todas las queries por cliente ya que no tenemos el client_id aquí
      queryClient.invalidateQueries({ queryKey: [...customAppsKeys.all, 'client'] })
      toast.success('Aplicación eliminada exitosamente')
    },
  })
}

// Crear seguimiento
export function useCreateCustomAppFollowup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CustomAppFollowupInsert) => customApplicationsService.createFollowup(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.followups(data.application_id) })
      toast.success('Seguimiento registrado exitosamente')
    },
    onError: (err) => {
      toast.error('Error al crear seguimiento: ' + (err as Error).message)
    },
  })
}

// Eliminar seguimiento
export function useDeleteCustomAppFollowup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, applicationId }: { id: string; applicationId: string }) =>
      customApplicationsService.deleteFollowup(id),
    onSuccess: (_, { applicationId }) => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.followups(applicationId) })
      toast.success('Seguimiento eliminado exitosamente')
    },
    onError: (err) => {
      toast.error('Error al eliminar seguimiento: ' + (err as Error).message)
    },
  })
}
