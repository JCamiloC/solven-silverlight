"use client"
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'

export default function SistemasOperativosPage() {
  return (
    <ProtectedRoute allowedRoles={["administrador","lider_soporte"]}>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Sistemas Operativos</h1>
            <p className="text-muted-foreground">Gestiona las opciones de sistemas operativos que aparecerán en los selectores del formulario.</p>
          </div>
          <div>
            <Button>Agregar SO</Button>
          </div>
        </div>

        <div className="p-4 border rounded">Placeholder: implementa CRUD de Sistemas Operativos aquí.</div>
      </div>
    </ProtectedRoute>
  )
}
