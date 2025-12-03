'use client'

import { useParams, useRouter } from 'next/navigation'
import { SeguimientosView } from '@/components/hardware'
import { useHardwareAsset } from '@/hooks/use-hardware'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function HardwareSeguimientosPage() {
  const params = useParams()
  const router = useRouter()
  const hardwareId = params.hardwareId as string
  const clientId = params.id as string

  const { data: hardware, isLoading } = useHardwareAsset(hardwareId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => router.push(`/dashboard/clientes/${clientId}/hardware`)}
        className="w-full sm:w-auto"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Hardware
      </Button>

      {/* Seguimientos View */}
      <SeguimientosView 
        hardwareId={hardwareId} 
        hardwareName={hardware?.name}
      />
    </div>
  )
}
