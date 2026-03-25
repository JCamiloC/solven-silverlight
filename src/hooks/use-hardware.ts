import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hardwareService } from '@/services/hardware';
import { toast } from 'sonner';
import { HardwareAsset, AccionRecomendadaEstado } from '@/types';

// EstadÃ­sticas globales de hardware
export function useHardwareStats() {
  return useQuery({
    queryKey: hardwareKeys.stats(),
    queryFn: hardwareService.getStats,
    staleTime: 2 * 60 * 1000,
  });
}

// Follow-ups hooks
export function useGetFollowUps(hardwareId: string) {
  return useQuery({
    queryKey: [...hardwareKeys.all, 'followups', hardwareId],
    queryFn: () => hardwareService.getFollowUps(hardwareId),
    enabled: !!hardwareId,
    staleTime: 60 * 1000,
  });
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ 
      hardwareId, 
      payload 
    }: { 
      hardwareId: string
      payload: { 
        tipo: string
        detalle: string
        accion_recomendada?: string
        accion_recomendada_estado?: AccionRecomendadaEstado
        actividades?: string[]
        foto_url?: string
        fecha_registro?: string
        creado_por?: string 
      } 
    }) =>
      hardwareService.createFollowUp(hardwareId, payload),
    onSuccess: (_, { hardwareId }) => {
      queryClient.invalidateQueries({ queryKey: [...hardwareKeys.all, 'followups', hardwareId] });
      toast.success('Seguimiento guardado exitosamente');
    },
    onError: (error) => {
      console.error('Error creating follow-up:', error);
      toast.error('Error al guardar el seguimiento');
    },
  });
}
// Query keys
export const hardwareKeys = {
  all: ['hardware'] as const,
  list: () => [...hardwareKeys.all, 'list'] as const,
  detail: (id: string) => [...hardwareKeys.all, 'detail', id] as const,
  stats: () => [...hardwareKeys.all, 'stats'] as const,
  byClient: (clientId: string) => [...hardwareKeys.all, 'client', clientId] as const,
};

// List all hardware assets
export function useHardwareAssets() {
  return useQuery({
    queryKey: hardwareKeys.list(),
    queryFn: hardwareService.getAll,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// List hardware assets by client
export function useHardwareAssetsByClient(clientId: string) {
  return useQuery({
    queryKey: hardwareKeys.byClient(clientId),
    queryFn: () => hardwareService.getByClient(clientId),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Get hardware asset by id
export function useHardwareAsset(id: string) {
  return useQuery({
    queryKey: hardwareKeys.detail(id),
    queryFn: () => hardwareService.getById(id),
    enabled: !!id,
  });
}

// Get hardware stats

// Get hardware stats by client
export function useHardwareStatsByClient(clientId: string) {
  return useQuery({
    queryKey: [...hardwareKeys.stats(), clientId],
    queryFn: () => hardwareService.getStatsByClient(clientId),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}

// Create hardware asset
export function useCreateHardware() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => {
      const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
      return hardwareService.create(cleanData as any);
    },
    onMutate: async (newAsset: any) => {
      await queryClient.cancelQueries({ queryKey: hardwareKeys.list() });
      const previousAssets = queryClient.getQueryData(hardwareKeys.list());
      queryClient.setQueryData(hardwareKeys.list(), (old: HardwareAsset[] = []) => [
        {
          ...newAsset,
          id: 'temp-' + Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as HardwareAsset,
        ...old,
      ]);
      return { previousAssets };
    },
    onError: (err, newAsset, context) => {
      queryClient.setQueryData(hardwareKeys.list(), context?.previousAssets);
      toast.error('Error al crear el activo tecnológico: ' + err.message);
    },
    onSuccess: () => {
      toast.success('Activo tecnológico creado exitosamente');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: hardwareKeys.list() });
      // If payload included client_id, also invalidate that client's list
      try {
        const possibleClientId = (arguments && (arguments as any)[2])?.client_id;
        if (possibleClientId) queryClient.invalidateQueries({ queryKey: hardwareKeys.byClient(possibleClientId) });
      } catch (e) {}
      queryClient.invalidateQueries({ queryKey: hardwareKeys.stats() });
    },
  });
}

// Update hardware asset
export function useUpdateHardware() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<HardwareAsset> }) => {
      // Elimina campos undefined para evitar errores en el backend
      const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
      return hardwareService.update(id, cleanUpdates);
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: hardwareKeys.list() });
      await queryClient.cancelQueries({ queryKey: hardwareKeys.detail(id) });
      const previousAssets = queryClient.getQueryData(hardwareKeys.list());
      const previousAsset = queryClient.getQueryData(hardwareKeys.detail(id));
      queryClient.setQueryData(hardwareKeys.list(), (old: HardwareAsset[] = []) =>
        old.map((asset) =>
          asset.id === id ? { ...asset, ...updates, updated_at: new Date().toISOString() } : asset
        )
      );
      queryClient.setQueryData(hardwareKeys.detail(id), (old: HardwareAsset) =>
        old ? { ...old, ...updates, updated_at: new Date().toISOString() } : old
      );
      return { previousAssets, previousAsset };
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(hardwareKeys.list(), context?.previousAssets);
      queryClient.setQueryData(hardwareKeys.detail(id), context?.previousAsset);
      toast.error('Error al actualizar el activo tecnológico: ' + err.message);
    },
    onSuccess: () => {
      toast.success('Activo tecnológico actualizado exitosamente');
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: hardwareKeys.list() });
      queryClient.invalidateQueries({ queryKey: hardwareKeys.detail(id) });
      // Try to invalidate the by-client cache for this asset. Prefer previousAsset from context if available.
      try {
        const ctx = (arguments as any)[3];
        const prev = ctx?.previousAsset;
        const possibleClientId = prev?.client_id || (arguments && (arguments as any)[2])?.updates?.client_id;
        if (possibleClientId) queryClient.invalidateQueries({ queryKey: hardwareKeys.byClient(possibleClientId) });
      } catch (e) {}
      queryClient.invalidateQueries({ queryKey: hardwareKeys.stats() });
    },
  });
}

// Delete hardware asset
export function useDeleteHardware() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hardwareService.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: hardwareKeys.list() });
      const previousAssets = queryClient.getQueryData(hardwareKeys.list());
      queryClient.setQueryData(hardwareKeys.list(), (old: HardwareAsset[] = []) =>
        old.filter((asset) => asset.id !== id)
      );
      return { previousAssets };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(hardwareKeys.list(), context?.previousAssets);
      toast.error('Error al eliminar el activo tecnológico: ' + err.message);
    },
    onSuccess: () => {
      toast.success('Activo tecnológico eliminado exitosamente');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: hardwareKeys.list() });
      queryClient.invalidateQueries({ queryKey: hardwareKeys.stats() });
    },
  });
}
