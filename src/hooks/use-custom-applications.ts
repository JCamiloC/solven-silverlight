import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  customApplicationsService,
  CustomApplicationInsert,
  CustomApplicationUpdate,
  CustomApplicationWithRelations,
  CustomApplicationStats,
  CustomAppFollowupInsert,
  SoftwareDocumentInsert,
  SoftwareMeetingInsert,
  SoftwareMeetingItemInsert,
  SoftwareProjectPhaseUpdate,
  SoftwareReleaseInsert,
  SoftwarePostsaleAdjustmentInsert,
  SoftwareMeetingItemUpdate,
  SoftwareReleaseUpdate,
  SoftwarePostsaleAdjustmentUpdate,
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
  phases: (appId: string) => [...customAppsKeys.all, 'phases', appId] as const,
  documents: (appId: string) => [...customAppsKeys.all, 'documents', appId] as const,
  meetings: (appId: string) => [...customAppsKeys.all, 'meetings', appId] as const,
  meetingItems: (appId: string) => [...customAppsKeys.all, 'meeting-items', appId] as const,
  releases: (appId: string) => [...customAppsKeys.all, 'releases', appId] as const,
  postsale: (appId: string) => [...customAppsKeys.all, 'postsale', appId] as const,
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

export function useSoftwareProjectPhases(applicationId: string) {
  return useQuery({
    queryKey: customAppsKeys.phases(applicationId),
    queryFn: () => customApplicationsService.getProjectPhases(applicationId),
    enabled: !!applicationId,
    staleTime: 60 * 1000,
  })
}

export function useSoftwareDocuments(applicationId: string) {
  return useQuery({
    queryKey: customAppsKeys.documents(applicationId),
    queryFn: () => customApplicationsService.getDocuments(applicationId),
    enabled: !!applicationId,
    staleTime: 60 * 1000,
  })
}

export function useSoftwareMeetings(applicationId: string) {
  return useQuery({
    queryKey: customAppsKeys.meetings(applicationId),
    queryFn: () => customApplicationsService.getMeetings(applicationId),
    enabled: !!applicationId,
    staleTime: 60 * 1000,
  })
}

export function useSoftwareMeetingItems(applicationId: string) {
  return useQuery({
    queryKey: customAppsKeys.meetingItems(applicationId),
    queryFn: () => customApplicationsService.getMeetingItems(applicationId),
    enabled: !!applicationId,
    staleTime: 60 * 1000,
  })
}

export function useSoftwareReleases(applicationId: string) {
  return useQuery({
    queryKey: customAppsKeys.releases(applicationId),
    queryFn: () => customApplicationsService.getReleases(applicationId),
    enabled: !!applicationId,
    staleTime: 60 * 1000,
  })
}

export function useSoftwarePostsaleAdjustments(applicationId: string) {
  return useQuery({
    queryKey: customAppsKeys.postsale(applicationId),
    queryFn: () => customApplicationsService.getPostsaleAdjustments(applicationId),
    enabled: !!applicationId,
    staleTime: 60 * 1000,
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

export function useUpdateSoftwareProjectPhase(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SoftwareProjectPhaseUpdate }) =>
      customApplicationsService.updateProjectPhase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.phases(applicationId) })
      toast.success('Fase actualizada')
    },
    onError: (err) => {
      toast.error('Error al actualizar fase: ' + (err as Error).message)
    },
  })
}

export function useCreateSoftwareDocument(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SoftwareDocumentInsert) => customApplicationsService.createDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.documents(applicationId) })
      toast.success('Documento registrado')
    },
    onError: (err) => {
      toast.error('Error al registrar documento: ' + (err as Error).message)
    },
  })
}

export function useCreateSoftwareMeeting(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SoftwareMeetingInsert) => customApplicationsService.createMeeting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.meetings(applicationId) })
      toast.success('Reunión registrada')
    },
    onError: (err) => {
      toast.error('Error al registrar reunión: ' + (err as Error).message)
    },
  })
}

export function useCreateSoftwareMeetingItem(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SoftwareMeetingItemInsert) => customApplicationsService.createMeetingItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.meetingItems(applicationId) })
      toast.success('Ítem registrado')
    },
    onError: (err) => {
      toast.error('Error al registrar ítem: ' + (err as Error).message)
    },
  })
}

export function useUpdateSoftwareMeetingItem(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SoftwareMeetingItemUpdate }) =>
      customApplicationsService.updateMeetingItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.meetingItems(applicationId) })
      toast.success('Ítem actualizado')
    },
    onError: (err) => {
      toast.error('Error al actualizar ítem: ' + (err as Error).message)
    },
  })
}

export function useCreateSoftwareRelease(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SoftwareReleaseInsert) => customApplicationsService.createRelease(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.releases(applicationId) })
      toast.success('Salida registrada')
    },
    onError: (err) => {
      toast.error('Error al registrar salida: ' + (err as Error).message)
    },
  })
}

export function useUpdateSoftwareRelease(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SoftwareReleaseUpdate }) =>
      customApplicationsService.updateRelease(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.releases(applicationId) })
      toast.success('Salida actualizada')
    },
    onError: (err) => {
      toast.error('Error al actualizar salida: ' + (err as Error).message)
    },
  })
}

export function useCreateSoftwarePostsaleAdjustment(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SoftwarePostsaleAdjustmentInsert) =>
      customApplicationsService.createPostsaleAdjustment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.postsale(applicationId) })
      toast.success('Ajuste posventa registrado')
    },
    onError: (err) => {
      toast.error('Error al registrar posventa: ' + (err as Error).message)
    },
  })
}

export function useUpdateSoftwarePostsaleAdjustment(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SoftwarePostsaleAdjustmentUpdate }) =>
      customApplicationsService.updatePostsaleAdjustment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customAppsKeys.postsale(applicationId) })
      toast.success('Ajuste posventa actualizado')
    },
    onError: (err) => {
      toast.error('Error al actualizar posventa: ' + (err as Error).message)
    },
  })
}
