import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  softwareService, 
  SoftwareLicenseInsert, 
  SoftwareLicenseUpdate,
  SoftwareLicenseWithRelations,
  SoftwareStats
} from '@/lib/services/software'

// Query keys para React Query cache management
export const softwareKeys = {
  all: ['software'] as const,
  lists: () => [...softwareKeys.all, 'list'] as const,
  list: (filters: string) => [...softwareKeys.lists(), { filters }] as const,
  details: () => [...softwareKeys.all, 'detail'] as const,
  detail: (id: string) => [...softwareKeys.details(), id] as const,
  stats: () => [...softwareKeys.all, 'stats'] as const,
  byClient: (clientId: string) => [...softwareKeys.all, 'client', clientId] as const,
  expiringSoon: (days: number) => [...softwareKeys.all, 'expiring', days] as const,
}

// Hook para obtener todas las licencias de software
export function useSoftwareLicenses() {
  return useQuery({
    queryKey: softwareKeys.lists(),
    queryFn: softwareService.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook para obtener una licencia específica
export function useSoftwareLicense(id: string) {
  return useQuery({
    queryKey: softwareKeys.detail(id),
    queryFn: () => softwareService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// Hook para obtener estadísticas de software
export function useSoftwareStats() {
  return useQuery({
    queryKey: softwareKeys.stats(),
    queryFn: softwareService.getStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Hook para obtener licencias por cliente
export function useSoftwareByClient(clientId: string) {
  return useQuery({
    queryKey: softwareKeys.byClient(clientId),
    queryFn: () => softwareService.getByClient(clientId),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  })
}

// Hook para obtener licencias que expiran pronto
export function useSoftwareExpiringSoon(days: number = 30) {
  return useQuery({
    queryKey: softwareKeys.expiringSoon(days),
    queryFn: () => softwareService.getExpiringSoon(days),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Hook para crear nueva licencia
export function useCreateSoftwareLicense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SoftwareLicenseInsert) => softwareService.create(data),
    onMutate: async (newLicense) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: softwareKeys.lists() })

      // Snapshot the previous value
      const previousLicenses = queryClient.getQueryData(softwareKeys.lists())

      // Optimistically update to the new value
      queryClient.setQueryData(softwareKeys.lists(), (old: SoftwareLicenseWithRelations[] | undefined) => {
        if (!old) return []
        
        const optimisticLicense = {
          id: `temp-${Date.now()}`,
          ...newLicense,
          license_type: newLicense.license_type || 'subscription',
          status: newLicense.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as SoftwareLicenseWithRelations

        return [optimisticLicense, ...old]
      })

      return { previousLicenses }
    },
    onError: (err, newLicense, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousLicenses) {
        queryClient.setQueryData(softwareKeys.lists(), context.previousLicenses)
      }
      toast.error('Error al crear la licencia: ' + (err as Error).message)
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: softwareKeys.lists() })
      queryClient.invalidateQueries({ queryKey: softwareKeys.byClient(data.client_id) })
      queryClient.invalidateQueries({ queryKey: softwareKeys.stats() })
      toast.success('Licencia creada exitosamente')
    },
  })
}

// Hook para actualizar licencia
export function useUpdateSoftwareLicense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SoftwareLicenseUpdate }) => 
      softwareService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: softwareKeys.lists() })
      await queryClient.cancelQueries({ queryKey: softwareKeys.detail(id) })

      // Snapshot the previous values
      const previousLicenses = queryClient.getQueryData(softwareKeys.lists())
      const previousLicense = queryClient.getQueryData(softwareKeys.detail(id))

      // Optimistically update the lists
      queryClient.setQueryData(softwareKeys.lists(), (old: SoftwareLicenseWithRelations[] | undefined) => {
        if (!old) return []
        return old.map(license => {
          if (license.id === id) {
            return { ...license, ...data, updated_at: new Date().toISOString() }
          }
          return license
        })
      })

      // Optimistically update the detail
      queryClient.setQueryData(softwareKeys.detail(id), (old: SoftwareLicenseWithRelations | undefined) => {
        if (!old) return old
        return { ...old, ...data, updated_at: new Date().toISOString() }
      })

      return { previousLicenses, previousLicense }
    },
    onError: (err, { id }, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousLicenses) {
        queryClient.setQueryData(softwareKeys.lists(), context.previousLicenses)
      }
      if (context?.previousLicense) {
        queryClient.setQueryData(softwareKeys.detail(id), context.previousLicense)
      }
      toast.error('Error al actualizar la licencia: ' + (err as Error).message)
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: softwareKeys.lists() })
      queryClient.invalidateQueries({ queryKey: softwareKeys.byClient(data.client_id) })
      queryClient.invalidateQueries({ queryKey: softwareKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: softwareKeys.stats() })
      toast.success('Licencia actualizada exitosamente')
    },
  })
}

// Hook para eliminar licencia
export function useDeleteSoftwareLicense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => softwareService.delete(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: softwareKeys.lists() })

      // Snapshot the previous value
      const previousLicenses = queryClient.getQueryData(softwareKeys.lists())

      // Optimistically update to remove the license
      queryClient.setQueryData(softwareKeys.lists(), (old: SoftwareLicenseWithRelations[] | undefined) => {
        if (!old) return []
        return old.filter(license => license.id !== id)
      })

      return { previousLicenses }
    },
    onError: (err, id, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousLicenses) {
        queryClient.setQueryData(softwareKeys.lists(), context.previousLicenses)
      }
      toast.error('Error al eliminar la licencia: ' + (err as Error).message)
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: softwareKeys.lists() })
      queryClient.invalidateQueries({ queryKey: softwareKeys.stats() })
      toast.success('Licencia eliminada exitosamente')
    },
  })
}