"use client";
import { useParams, useRouter } from 'next/navigation';
import { HardwareTable, HardwareStats, HardwareForm } from '@/components/hardware';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useHardwareAssetsByClient } from '@/hooks/use-hardware';
import { useClient } from '@/hooks/use-clients';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loading } from '@/components/ui/loading';

export default function ClienteHardwarePage() {
  const { id } = useParams();
  const router = useRouter();
  const clientId = typeof id === 'string' ? id : '';
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: assets, isLoading, error } = useHardwareAssetsByClient(clientId);
  const { data: client, isLoading: isLoadingClient } = useClient(clientId);

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-destructive">Error al cargar los datos</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message || 'Ocurrió un error inesperado'}
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (isLoadingClient) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" text="Cargando información del cliente..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/clientes/${clientId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Hardware de {client?.name || 'Cliente'}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gestión de activos de hardware asignados a este cliente
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => router.push(`/dashboard/clientes/${clientId}/hardware/reporte`)}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Ver Reporte
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Hardware
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Hardware</DialogTitle>
                  <DialogDescription>
                    Complete los datos del nuevo activo de hardware.
                  </DialogDescription>
                </DialogHeader>
                <HardwareForm 
                  onSuccess={() => setShowCreateDialog(false)}
                  onCancel={() => setShowCreateDialog(false)}
                  asset={undefined}
                  clientId={clientId}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <HardwareStats clientId={clientId} />
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Lista de Hardware</h2>
          </div>
          <HardwareTable 
            data={assets || []} 
            isLoading={isLoading}
            clientId={clientId}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
