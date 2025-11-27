"use client"
import { ProtectedRoute } from '@/components/auth/protected-route'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Edit } from 'lucide-react'
import { useParameters } from '@/hooks/use-parameters'
import { useRouter } from 'next/navigation'

export default function ParametrosPage() {
  const { data, isLoading } = useParameters()
  const router = useRouter()

  return (
    <ProtectedRoute allowedRoles={["administrador","lider_soporte"]}>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Parámetros</h1>
            <p className="text-muted-foreground">Gestiona valores reutilizables (marca, tipo, sistemas operativos, MS Office, etc.)</p>
          </div>
          <div>
            <Button onClick={() => router.push('/dashboard/parametros/nuevo')}>
              <Plus className="mr-2 h-4 w-4"/> Crear Parámetro
            </Button>
          </div>
        </div>

        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-4">Listado de Parámetros</h2>
          {isLoading ? (
            <div>Cargando...</div>
          ) : (
            <div className="space-y-2">
              {(data || []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-muted-foreground">Key: {p.key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/parametros/${encodeURIComponent(p.key)}`)}>
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/parametros/${encodeURIComponent(p.key)}`)}>
                      <a className="text-sm text-muted-foreground">Ver</a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
