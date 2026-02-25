import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  clientMaintenancesService,
  ClientMaintenanceUpdate,
} from '@/lib/services/client-maintenances'

export const clientMaintenanceKeys = {
  all: ['client-maintenances'] as const,
  byClientYear: (clientId: string, year: number) => [...clientMaintenanceKeys.all, clientId, year] as const,
}

export function useClientMaintenances(clientId: string, year: number) {
  return useQuery({
    queryKey: clientMaintenanceKeys.byClientYear(clientId, year),
    queryFn: () => clientMaintenancesService.listByClient(clientId, year),
    enabled: !!clientId && !!year,
    staleTime: 60 * 1000,
  })
}

export function useEnsureClientMaintenanceSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ clientId, year, totalMaintenances }: { clientId: string; year: number; totalMaintenances: number }) =>
      clientMaintenancesService.ensureYearSchedule(clientId, year, totalMaintenances),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: clientMaintenanceKeys.byClientYear(variables.clientId, variables.year) })
      toast.success('Agenda de mantenimientos generada')
    },
    onError: (error: Error) => {
      toast.error(`Error al generar agenda: ${error.message}`)
    },
  })
}

export function useUpdateClientMaintenance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
      clientId,
      year,
      updaterId,
    }: {
      id: string
      updates: ClientMaintenanceUpdate
      clientId: string
      year: number
      updaterId?: string
    }) => clientMaintenancesService.update(id, updates, updaterId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: clientMaintenanceKeys.byClientYear(variables.clientId, variables.year) })
      toast.success('Mantenimiento actualizado')
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar mantenimiento: ${error.message}`)
    },
  })
}
