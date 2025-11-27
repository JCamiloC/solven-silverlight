"use client"
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function MarcasPage() {
  return (
    <ProtectedRoute allowedRoles={["administrador","lider_soporte"]}>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Marcas</h1>
            <p className="text-muted-foreground">Lista y gestión de marcas.</p>
          </div>
          <div>
            <Button>Agregar Marca</Button>
          </div>
        </div>

        <div className="p-4 border rounded">Placeholder: implementa CRUD de Marcas aquí.</div>
      </div>
    </ProtectedRoute>
  )
}
