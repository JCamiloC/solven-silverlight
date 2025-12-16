'use client'

import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useCustomApplication } from '@/hooks/use-custom-applications'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { SeguimientosView } from '@/components/custom-apps/seguimientos-view'

export default function SoftwareSeguimientosPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const applicationId = params.appId as string

  const { data: application, isLoading } = useCustomApplication(applicationId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!application) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground">Aplicación no encontrada</p>
        <Button onClick={() => router.push(`/dashboard/clientes/${clientId}/software`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Software
        </Button>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="space-y-4">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/clientes/${clientId}/software`)}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Software
        </Button>

        {/* Seguimientos Component */}
        <SeguimientosView 
          applicationId={applicationId} 
          applicationName={application.name}
        />
      </div>
    </ProtectedRoute>
  )
}
