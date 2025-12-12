'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { CustomAppStats, CustomAppTable, CustomAppForm } from '@/components/custom-apps'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

export default function SoftwarePage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingAppId, setEditingAppId] = useState<string | null>(null)

  const handleEdit = (id: string) => {
    setEditingAppId(id)
    setCreateDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setCreateDialogOpen(false)
    setEditingAppId(null)
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Software</h1>
            <p className="text-muted-foreground mt-1">
              Vista global de todas las aplicaciones personalizadas
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Aplicación
          </Button>
        </div>

        {/* Stats */}
        <CustomAppStats />

        {/* Table - Vista global de todas las aplicaciones */}
        <CustomAppTable onEdit={handleEdit} />

        {/* Create/Edit Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAppId ? 'Editar Aplicación' : 'Nueva Aplicación Personalizada'}
              </DialogTitle>
              <DialogDescription>
                {editingAppId
                  ? 'Actualiza la información de la aplicación'
                  : 'Registra una nueva aplicación desarrollada para un cliente'}
              </DialogDescription>
            </DialogHeader>
            <CustomAppForm
              onSuccess={handleCloseDialog}
              onCancel={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
