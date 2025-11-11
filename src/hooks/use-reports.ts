import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  ReportsService, 
  ReportFilters, 
  OverviewMetrics, 
  ClientReport, 
  HardwareMetrics, 
  ClientActivityMetrics 
} from '@/lib/services/reports'

// Query keys para React Query cache management
export const reportsKeys = {
  all: ['reports'] as const,
  overview: () => [...reportsKeys.all, 'overview'] as const,
  clients: () => [...reportsKeys.all, 'clients'] as const,
  clientReports: (filters: ReportFilters) => [...reportsKeys.clients(), { filters }] as const,
  hardwareMetrics: (filters: ReportFilters) => [...reportsKeys.all, 'hardware-metrics', { filters }] as const,
  clientActivity: () => [...reportsKeys.all, 'client-activity'] as const,
}

/**
 * Hook para obtener métricas generales del sistema
 */
export function useOverviewMetrics() {
  return useQuery({
    queryKey: reportsKeys.overview(),
    queryFn: () => ReportsService.getOverviewMetrics(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para obtener reportes de clientes
 */
export function useClientReports(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: reportsKeys.clientReports(filters),
    queryFn: () => ReportsService.getClientReports(filters),
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

/**
 * Hook para obtener métricas de hardware a lo largo del tiempo
 */
export function useHardwareMetrics(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: reportsKeys.hardwareMetrics(filters),
    queryFn: () => ReportsService.getHardwareMetrics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para obtener métricas de actividad por cliente
 */
export function useClientActivityMetrics() {
  return useQuery({
    queryKey: reportsKeys.clientActivity(),
    queryFn: () => ReportsService.getClientActivityMetrics(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para exportar reporte de cliente a Excel
 */
export function useExportClientReport() {
  return useMutation({
    mutationFn: async ({ clientId, clientName }: { clientId: string; clientName: string }) => {
      return ReportsService.exportClientReportToExcel(clientId, clientName)
    },
    onSuccess: () => {
      toast.success('Reporte exportado exitosamente')
    },
    onError: (error) => {
      toast.error('Error al exportar reporte: ' + (error as Error).message)
    },
  })
}

/**
 * Hook para exportar resumen general a PDF
 */
export function useExportOverviewPDF() {
  return useMutation({
    mutationFn: () => ReportsService.exportOverviewToPDF(),
    onSuccess: () => {
      toast.success('Reporte PDF generado exitosamente')
    },
    onError: (error) => {
      toast.error('Error al generar PDF: ' + (error as Error).message)
    },
  })
}