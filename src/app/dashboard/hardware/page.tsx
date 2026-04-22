'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  HardwareTable,
  HardwareForm,
  HardwareStats
} from '@/components/hardware'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useHardwareAssets } from '@/hooks/use-hardware'

export default function HardwarePage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { data: assets, isLoading, error } = useHardwareAssets()

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
    )
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hardware</h1>
            <p className="text-muted-foreground">
              Gestión de activos de hardware y activos tecnológicos
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
                clientId=""
                onSuccess={() => setShowCreateDialog(false)}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <HardwareStats clientId="" />

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
  )
}