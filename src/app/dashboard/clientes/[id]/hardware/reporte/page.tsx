"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useHardwareAssetsByClient } from '@/hooks/use-hardware';
import { useClient } from '@/hooks/use-clients';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import { HardwareReport } from '@/components/hardware/hardware-report';
import { useHardwareAnalytics } from '@/hooks/use-hardware-analytics';
import { HardwareReportPDF } from '@/lib/services/hardware-report-pdf';
import { toast } from 'sonner';

export default function ClienteHardwareReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const clientId = typeof id === 'string' ? id : '';
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  const { data: assets, isLoading, error } = useHardwareAssetsByClient(clientId);
  const { data: client, isLoading: isLoadingClient } = useClient(clientId);
  const analytics = useHardwareAnalytics(assets || []);

  const handleExportPDF = async () => {
    if (!assets || !client) return;

    try {
      setGeneratingPDF(true);
      toast.info('Generando reporte PDF...');
      
      await HardwareReportPDF.generateReport(
        assets,
        analytics,
        client.name
      );
      
      toast.success('Reporte PDF generado exitosamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar el reporte PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

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

  if (isLoadingClient || isLoading) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" text="Cargando reporte..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/dashboard/clientes/${clientId}/hardware`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Reporte de Hardware
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {client?.name || 'Cliente'}
              </p>
            </div>
          </div>
          
          {/* Botón de exportar PDF */}
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={generatingPDF || !assets || assets.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {generatingPDF ? 'Generando...' : 'Exportar PDF'}
          </Button>
        </div>

        <HardwareReport assets={assets || []} clientName={client?.name} />
      </div>
    </ProtectedRoute>
  );
}
