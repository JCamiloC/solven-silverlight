import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hardwareService } from '@/services/hardware'
import { HardwareAsset } from '@/types'
import { toast } from 'sonner'

// Query keys
export const hardwareKeys = {
  all: ['hardware'] as const,
  list: () => [...hardwareKeys.all, 'list'] as const,
  detail: (id: string) => [...hardwareKeys.all, 'detail', id] as const,
  stats: () => [...hardwareKeys.all, 'stats'] as const,
}

// Queries
export function useHardwareAssets() {
  return useQuery({
    queryKey: hardwareKeys.list(),
    queryFn: hardwareService.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useHardwareAsset(id: string) {
  return useQuery({
    queryKey: hardwareKeys.detail(id),
    queryFn: () => hardwareService.getById(id),
    enabled: !!id,
  })
}

export function useHardwareStats() {
  return useQuery({
    queryKey: hardwareKeys.stats(),
    queryFn: hardwareService.getStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Mutations
export function useCreateHardware() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Omit<HardwareAsset, 'id' | 'created_at' | 'updated_at'>) =>
      hardwareService.create(data),
    onMutate: async (newAsset) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: hardwareKeys.list() })
      
      // Snapshot previous value
      const previousAssets = queryClient.getQueryData(hardwareKeys.list())
      
      // Optimistically update
      queryClient.setQueryData(hardwareKeys.list(), (old: HardwareAsset[] = []) => [
        {
          ...newAsset,
          id: 'temp-' + Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as HardwareAsset,
        ...old,
      ])
      
      return { previousAssets }
    },
    onError: (err, newAsset, context) => {
      // Rollback on error
      queryClient.setQueryData(hardwareKeys.list(), context?.previousAssets)
      toast.error('Error al crear el equipo: ' + err.message)
    },
    onSuccess: () => {
      toast.success('Equipo creado exitosamente')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: hardwareKeys.list() })
      queryClient.invalidateQueries({ queryKey: hardwareKeys.stats() })
    },
  })
}

export function useUpdateHardware() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<HardwareAsset> }) =>
      hardwareService.update(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: hardwareKeys.list() })
      await queryClient.cancelQueries({ queryKey: hardwareKeys.detail(id) })
      
      const previousAssets = queryClient.getQueryData(hardwareKeys.list())
      const previousAsset = queryClient.getQueryData(hardwareKeys.detail(id))
      
      // Optimistically update list
      queryClient.setQueryData(hardwareKeys.list(), (old: HardwareAsset[] = []) =>
        old.map((asset) =>
          asset.id === id ? { ...asset, ...updates, updated_at: new Date().toISOString() } : asset
        )
      )
      
      // Optimistically update detail
      queryClient.setQueryData(hardwareKeys.detail(id), (old: HardwareAsset) =>
        old ? { ...old, ...updates, updated_at: new Date().toISOString() } : old
      )
      
      return { previousAssets, previousAsset }
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(hardwareKeys.list(), context?.previousAssets)
      queryClient.setQueryData(hardwareKeys.detail(id), context?.previousAsset)
      toast.error('Error al actualizar el equipo: ' + err.message)
    },
    onSuccess: () => {
      toast.success('Equipo actualizado exitosamente')
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: hardwareKeys.list() })
      queryClient.invalidateQueries({ queryKey: hardwareKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: hardwareKeys.stats() })
    },
  })
}

export function useDeleteHardware() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: hardwareService.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: hardwareKeys.list() })
      
      const previousAssets = queryClient.getQueryData(hardwareKeys.list())
      
      queryClient.setQueryData(hardwareKeys.list(), (old: HardwareAsset[] = []) =>
        old.filter((asset) => asset.id !== id)
      )
      
      return { previousAssets }
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(hardwareKeys.list(), context?.previousAssets)
      toast.error('Error al eliminar el equipo: ' + err.message)
    },
    onSuccess: () => {
      toast.success('Equipo eliminado exitosamente')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: hardwareKeys.list() })
      queryClient.invalidateQueries({ queryKey: hardwareKeys.stats() })
    },
  })
}