import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MaintenanceReportService } from '@/lib/services/maintenance-report'
import { MaintenanceReportFilters } from '@/types'

export const maintenanceReportKeys = {
  all: ['maintenance-reports'] as const,
  report: (filters: MaintenanceReportFilters) => [...maintenanceReportKeys.all, { filters }] as const,
}

/**
 * Hook para obtener el reporte de mantenimiento
 */
export function useMaintenanceReport(filters: MaintenanceReportFilters, enabled: boolean = false) {
  return useQuery({
    queryKey: maintenanceReportKeys.report(filters),
    queryFn: async () => {
      if (filters.reportType === 'hardware') {
        return MaintenanceReportService.getHardwareMaintenanceReport(filters)
      }
      // Aquí se pueden agregar otros tipos de reportes (software, accesos)
      return []
    },
    enabled: enabled && !!filters.clientId && !!filters.year && !!filters.month,
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

/**
 * Hook para exportar reporte a PDF
 */
export function useExportMaintenancePDF() {
  return useMutation({
    mutationFn: async ({ 
      rows, 
      clientName, 
      month, 
      year 
    }: { 
      rows: any[]
      clientName: string
      month: number
      year: number
    }) => {
      return MaintenanceReportService.generateMaintenancePDF(rows, clientName, month, year)
    },
    onSuccess: () => {
      toast.success('Reporte PDF generado exitosamente')
    },
    onError: (error) => {
      toast.error('Error al generar PDF: ' + (error as Error).message)
    },
  })
}

/**
 * Hook para exportar reporte a Word
 */
export function useExportMaintenanceWord() {
  return useMutation({
    mutationFn: async ({ 
      rows, 
      clientName, 
      month, 
      year 
    }: { 
      rows: any[]
      clientName: string
      month: number
      year: number
    }) => {
      return MaintenanceReportService.exportToWord(rows, clientName, month, year)
    },
    onSuccess: () => {
      toast.success('Reporte Word generado exitosamente')
    },
    onError: (error) => {
      toast.error('Error al exportar Word: ' + (error as Error).message)
    },
  })
}
