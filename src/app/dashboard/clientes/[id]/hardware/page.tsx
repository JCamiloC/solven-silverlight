"use client";
import { useParams } from 'next/navigation';
import { HardwareTable, HardwareStats, HardwareForm } from '@/components/hardware';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useHardwareAssetsByClient } from '@/hooks/use-hardware';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ClienteHardwarePage() {
  const { id } = useParams();
  const clientId = typeof id === 'string' ? id : '';
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: assets, isLoading, error } = useHardwareAssetsByClient(clientId);

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

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hardware de Cliente</h1>
            <p className="text-muted-foreground">
              Gestión de activos de hardware asignados a este cliente
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
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
        <HardwareStats clientId={clientId} />
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Lista de Hardware</h2>
          </div>
          <HardwareTable 
            data={assets || []} 
            isLoading={isLoading}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
