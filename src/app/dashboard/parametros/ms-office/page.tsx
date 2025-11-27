"use client"
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'

export default function MsOfficePage() {
  return (
    <ProtectedRoute allowedRoles={["administrador","lider_soporte"]}>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">MS Office</h1>
            <p className="text-muted-foreground">Gestiona las versiones/opciones de MS Office disponibles.</p>
          </div>
          <div>
            <Button>Agregar MS Office</Button>
          </div>
        </div>

        <div className="p-4 border rounded">Placeholder: implementa CRUD de MS Office aquí.</div>
      </div>
    </ProtectedRoute>
  )
}
