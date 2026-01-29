import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import ActasService from '@/services/actas'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const QUERY_KEYS = {
  actas: ['actas'] as const,
  actaByToken: (t: string) => ['actas', 'token', t] as const,
}

export function useActaByToken(token: string) {
  return useQuery({
    queryKey: QUERY_KEYS.actaByToken(token),
    queryFn: () => ActasService.getByToken(token),
    enabled: !!token,
  })
}

export function useCreateActa() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => ActasService.createActa(data),
    onSuccess: (data) => {
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
    mutationFn: (data: any) => ActasService.signByClient(data),
    onSuccess: () => {
      toast.success('Acta firmada por cliente')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.actas })
    },
    onError: (error: any) => {
      toast.error('Error al firmar acta', { description: error.message })
    },
  })
}
