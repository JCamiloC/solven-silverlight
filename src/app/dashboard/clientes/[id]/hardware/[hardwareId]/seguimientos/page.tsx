'use client'

import { useParams, useRouter } from 'next/navigation'
import { SeguimientosView } from '@/components/hardware'
import { HardwareUpgradesHistory } from '@/components/hardware/hardware-upgrades-history'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useHardwareAsset } from '@/hooks/use-hardware'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Loader2, Wrench, History, FileText } from 'lucide-react'
import { hardwareService } from '@/services/hardware'
import { HardwareLifesheetPDF } from '@/lib/services/hardware-lifesheet-pdf'
import { toast } from 'sonner'
import { useState } from 'react'

export default function HardwareSeguimientosPage() {
  const params = useParams()
  const router = useRouter()
  const hardwareId = params.hardwareId as string
  const clientId = params.id as string

  const { data: hardware, isLoading } = useHardwareAsset(hardwareId)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const handleGenerateLifesheet = async () => {
    if (!hardware) return

    try {
      setIsGeneratingPDF(true)
      toast.info('Generando Hoja de Vida', {
        description: 'Por favor espera...',
      })

      // Obtener upgrades, seguimientos y tickets asociados
      const [upgrades, followUps, tickets] = await Promise.all([
        hardwareService.getUpgrades(hardwareId),
        hardwareService.getFollowUps(hardwareId),
        hardwareService.getAssociatedTickets(hardwareId),
      ])

      // Generar PDF
      await HardwareLifesheetPDF.generateLifesheet(hardware, upgrades, followUps, tickets)

      toast.success('Hoja de Vida Generada', {
        description: 'El PDF se ha descargado correctamente.',
      })
    } catch (error) {
      console.error('Error generating lifesheet:', error)
      toast.error('Error', {
        description: 'No se pudo generar la hoja de vida.',
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
      <div className="space-y-4">
      {/* Header con botones */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/clientes/${clientId}/hardware`)}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Hardware
        </Button>

        <Button
          onClick={handleGenerateLifesheet}
          disabled={isGeneratingPDF}
          className="w-full sm:w-auto"
        >
          {isGeneratingPDF ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generar Hoja de Vida (PDF)
            </>
          )}
        </Button>
      </div>

      {/* Tabs para Seguimientos y Historial de Upgrades */}
      <Tabs defaultValue="seguimientos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="seguimientos" className="gap-2">
            <Wrench className="h-4 w-4" />
            Seguimientos
          </TabsTrigger>
          <TabsTrigger value="upgrades" className="gap-2">
            <History className="h-4 w-4" />
            Actualizaciones Físicas
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="seguimientos" className="mt-4">
          <SeguimientosView 
            hardwareId={hardwareId} 
            hardwareName={hardware?.name}
          />
        </TabsContent>
        
        <TabsContent value="upgrades" className="mt-4">
          <HardwareUpgradesHistory hardwareId={hardwareId} />
        </TabsContent>
      </Tabs>
      </div>
    </ProtectedRoute>
  )
}
