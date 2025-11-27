import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { parametersService } from '@/services/parameters'
import { toast } from 'sonner'

export const parameterKeys = {
  all: ['parameters'] as const,
  list: () => [...parameterKeys.all, 'list'] as const,
  detail: (key: string) => [...parameterKeys.all, 'detail', key] as const,
  options: (key: string) => [...parameterKeys.all, 'options', key] as const,
}

export function useParameters() {
  return useQuery({ queryKey: parameterKeys.list(), queryFn: () => parametersService.getAll(), staleTime: 2 * 60 * 1000 })
}

export function useParameterByKey(key: string | undefined) {
  return useQuery({ queryKey: parameterKeys.detail(key || ''), queryFn: () => parametersService.getByKey(key || ''), enabled: !!key })
}

export function useCreateParameter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => parametersService.create(payload),
    onSuccess: () => {
      toast.success('Parámetro creado')
      qc.invalidateQueries({ queryKey: parameterKeys.list() })
    },
    onError: (err: any) => toast.error('Error al crear parámetro: ' + (err.message || err)),
  })
}

export function useUpdateParameter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ keyOrId, updates }: { keyOrId: string; updates: any }) => parametersService.update(keyOrId, updates),
    onSuccess: (_, vars) => {
      toast.success('Parámetro actualizado')
      qc.invalidateQueries({ queryKey: parameterKeys.list() })
      qc.invalidateQueries({ queryKey: parameterKeys.detail(vars.keyOrId) })
    },
    onError: (err: any) => toast.error('Error al actualizar parámetro: ' + (err.message || err)),
  })
}

export function useDeleteParameter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (keyOrId: string) => parametersService.delete(keyOrId),
    onSuccess: () => {
      toast.success('Parámetro eliminado')
      qc.invalidateQueries({ queryKey: parameterKeys.list() })
    },
    onError: (err: any) => toast.error('Error al eliminar parámetro: ' + (err.message || err)),
  })
}
