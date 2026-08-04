import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import ActasService from '@/services/actas'

const QUERY_KEYS = {
  actas: ['actas'] as const,
  actaByToken: (t: string) => ['actas', 'token', t] as const,
  actasByHardware: (ids: string[]) => ['actas', 'hardware', ...ids] as const,
}

export function useActaByToken(token: string) {
  return useQuery({
    queryKey: QUERY_KEYS.actaByToken(token),
    queryFn: () => ActasService.getByToken(token),
    enabled: !!token,
    retry: 1,
    staleTime: 30_000,
  })
}

export function useLatestActasByHardwareIds(ids: string[]) {
  const sorted = [...ids].filter(Boolean).sort()
  return useQuery({
    queryKey: QUERY_KEYS.actasByHardware(sorted),
    queryFn: () => ActasService.getLatestByHardwareIds(sorted),
    enabled: sorted.length > 0,
  })
}

export { QUERY_KEYS as ACTAS_QUERY_KEYS }

export function useCreateActa() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => ActasService.createActa(data),
    onSuccess: () => {
      toast.success('Acta creada', { description: 'Se generó el link para la firma del cliente' })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.actas })
    },
    onError: (error: any) => {
      toast.error('Error al crear acta', { description: error.message })
    },
  })
}

export function useSignActa() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/actas/sign-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo firmar el acta')
      }

      return payload
    },
    onSuccess: (_data, variables) => {
      toast.success('Acta firmada', {
        description: 'Tu firma quedó registrada. Gracias.',
      })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.actas })
      if (variables?.token) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.actaByToken(variables.token) })
      }
    },
    onError: (error: any) => {
      toast.error('Error al firmar acta', { description: error.message })
    },
  })
}
