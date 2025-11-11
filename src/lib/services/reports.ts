import { createClient } from '@/lib/supabase/client'
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const supabase = createClient()

// Interfaces para reportes
export interface ReportFilters {
  clientId?: string
  startDate?: string
  endDate?: string
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
}

export interface OverviewMetrics {
  totalClients: number
  activeHardware: number
  activeLicenses: number
  totalCredentials: number
  recentActivity: number
}

export interface ClientReport {
  client: {
    id: string
    name: string
    email?: string
  }
  hardware: {
    total: number
    active: number
    maintenance: number
  }
  software: {
    total: number
    active: number
    expiring: number
  }
  credentials: {
    total: number
    lastAccess?: string
  }
}

export interface HardwareMetrics {
  date: string
  active: number
  maintenance: number
  total: number
}

export interface SoftwareMetrics {
  date: string
  active: number
  expiring: number
  expired: number
}

export interface ClientActivityMetrics {
  clientName: string
  hardware: number
  software: number
  credentials: number
  total: number
}

export class ReportsService {
  /**
   * Obtiene métricas generales del sistema
   */
  static async getOverviewMetrics(): Promise<OverviewMetrics> {
    try {
      const [clients, hardware, software, credentials] = await Promise.all([
        // Total de clientes únicos
        supabase
          .from('clients')
          .select('id', { count: 'exact' }),
        
        // Hardware activo
        supabase
          .from('hardware_assets')
          .select('status', { count: 'exact' })
          .eq('status', 'active'),
        
        // Software activo
        supabase
          .from('software_licenses')
          .select('status', { count: 'exact' })
          .eq('status', 'active'),
        
        // Total credenciales (solo para admins)
        supabase
          .from('access_credentials')
          .select('id', { count: 'exact' })
          .eq('status', 'active')
      ])

      // Actividad reciente (últimos 7 días)
      const recentDate = subDays(new Date(), 7).toISOString()
      const { count: recentActivity } = await supabase
        .from('hardware_assets')
        .select('id', { count: 'exact' })
        .gte('updated_at', recentDate)

      return {
        totalClients: clients.count || 0,
        activeHardware: hardware.count || 0,
        activeLicenses: software.count || 0,
        totalCredentials: credentials.count || 0,
        recentActivity: recentActivity || 0
      }
    } catch (error) {
      console.error('Error getting overview metrics:', error)
      throw new Error('Failed to get overview metrics')
    }
  }

  /**
   * Obtiene reportes por cliente
   */
  static async getClientReports(filters: ReportFilters = {}): Promise<ClientReport[]> {
    try {
      // Obtener clientes primero
      let clientsQuery = supabase
        .from('clients')
        .select('id, name, email')

      if (filters.clientId) {
        clientsQuery = clientsQuery.eq('id', filters.clientId)
      }

      const { data: clients, error: clientsError } = await clientsQuery

      if (clientsError) {
        console.error('Error fetching clients:', clientsError)
        return []
      }

      if (!clients || clients.length === 0) {
        return []
      }

      // Para cada cliente, obtener sus recursos por separado
      const clientReports = await Promise.all(
        clients.map(async (client) => {
          const [hardwareData, softwareData, credentialsData] = await Promise.all([
            // Hardware del cliente
            supabase
              .from('hardware_assets')
              .select('id, status, updated_at')
              .eq('client_id', client.id),
            
            // Software del cliente
            supabase
              .from('software_licenses')
              .select('id, status, expiration_date, updated_at')
              .eq('client_id', client.id),
            
            // Credenciales del cliente (solo para administradores)
            supabase
              .from('access_credentials')
              .select('id, status, updated_at')
              .eq('client_id', client.id)
          ])

          const hardware = hardwareData.data || []
          const software = softwareData.data || []
          const credentials = credentialsData.data || []

          // Filtrar por fechas si se especifican
          let filteredHardware = hardware
          let filteredSoftware = software
          let filteredCredentials = credentials

          if (filters.startDate && filters.endDate) {
            const start = new Date(filters.startDate)
            const end = new Date(filters.endDate)

            filteredHardware = hardware.filter(item => {
              const itemDate = new Date(item.updated_at)
              return itemDate >= start && itemDate <= end
            })

            filteredSoftware = software.filter(item => {
              const itemDate = new Date(item.updated_at || item.expiration_date)
              return itemDate >= start && itemDate <= end
            })

            filteredCredentials = credentials.filter(item => {
              const itemDate = new Date(item.updated_at)
              return itemDate >= start && itemDate <= end
            })
          }

          // Calcular métricas de software expirando (próximos 30 días)
          const thirtyDaysFromNow = new Date()
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

          const expiringSoftware = software.filter(item => {
            if (!item.expiration_date) return false
            const expirationDate = new Date(item.expiration_date)
            return expirationDate <= thirtyDaysFromNow && item.status === 'active'
          })

          return {
            client: {
              id: client.id,
              name: client.name,
              email: client.email
            },
            hardware: {
              total: filteredHardware.length,
              active: filteredHardware.filter(item => item.status === 'active').length,
              maintenance: filteredHardware.filter(item => item.status === 'maintenance').length
            },
            software: {
              total: filteredSoftware.length,
              active: filteredSoftware.filter(item => item.status === 'active').length,
              expiring: expiringSoftware.length
            },
            credentials: {
              total: filteredCredentials.length,
              lastAccess: filteredCredentials.length > 0 
                ? filteredCredentials
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
                    .updated_at
                : undefined
            }
          }
        })
      )

      return clientReports
    } catch (error) {
      console.error('Error getting client reports:', error)
      throw new Error('Failed to get client reports')
    }
  }

  /**
   * Obtiene métricas de hardware a lo largo del tiempo
   */
  static async getHardwareMetrics(filters: ReportFilters = {}): Promise<HardwareMetrics[]> {
    try {
      // Determinar rango de fechas
      const endDate = filters.endDate ? new Date(filters.endDate) : new Date()
      const defaultStartDate = filters.period === 'year' 
        ? startOfYear(endDate)
        : filters.period === 'month'
        ? startOfMonth(endDate)
        : subDays(endDate, 30)
      
      const startDate = filters.startDate ? new Date(filters.startDate) : defaultStartDate

      const { data: hardware, error } = await supabase
        .from('hardware_assets')
        .select('status, created_at, updated_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at')

      if (error) {
        console.error('Hardware metrics query error:', error)
        return []
      }

      // Agrupar por fecha
      const metricsMap = new Map<string, { active: number; maintenance: number; total: number }>()
      
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const dateKey = format(currentDate, 'yyyy-MM-dd')
        metricsMap.set(dateKey, { active: 0, maintenance: 0, total: 0 })
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Contar hardware por día
      hardware?.forEach(item => {
        const itemDate = format(new Date(item.created_at), 'yyyy-MM-dd')
        const existing = metricsMap.get(itemDate)
        if (existing) {
          existing.total += 1
          if (item.status === 'active') existing.active += 1
          if (item.status === 'maintenance') existing.maintenance += 1
        }
      })

      return Array.from(metricsMap.entries())
        .map(([date, metrics]) => ({
          date,
          ...metrics
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    } catch (error) {
      console.error('Error getting hardware metrics:', error)
      throw new Error('Failed to get hardware metrics')
    }
  }

  /**
   * Obtiene métricas de actividad por cliente
   */
  static async getClientActivityMetrics(): Promise<ClientActivityMetrics[]> {
    try {
      // Obtener clientes primero
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')

      if (clientsError) {
        console.error('Error fetching clients for activity metrics:', clientsError)
        return []
      }

      if (!clients || clients.length === 0) {
        return []
      }

      // Para cada cliente, contar sus recursos
      const clientMetrics = await Promise.all(
        clients.map(async (client) => {
          const [hardwareCount, softwareCount, credentialsCount] = await Promise.all([
            supabase
              .from('hardware_assets')
              .select('id', { count: 'exact' })
              .eq('client_id', client.id),
            
            supabase
              .from('software_licenses')
              .select('id', { count: 'exact' })
              .eq('client_id', client.id),
            
            supabase
              .from('access_credentials')
              .select('id', { count: 'exact' })
              .eq('client_id', client.id)
          ])

          const hardwareTotal = hardwareCount.count || 0
          const softwareTotal = softwareCount.count || 0
          const credentialsTotal = credentialsCount.count || 0

          return {
            clientName: client.name,
            hardware: hardwareTotal,
            software: softwareTotal,
            credentials: credentialsTotal,
            total: hardwareTotal + softwareTotal + credentialsTotal
          }
        })
      )

      return clientMetrics
        .filter(client => client.total > 0)
        .sort((a, b) => b.total - a.total)
    } catch (error) {
      console.error('Error getting client activity metrics:', error)
      throw new Error('Failed to get client activity metrics')
    }
  }

  /**
   * Exporta reporte de cliente a Excel
   */
  static async exportClientReportToExcel(clientId: string, clientName: string): Promise<void> {
    try {
      const reports = await this.getClientReports({ clientId })
      const report = reports[0]

      if (!report) {
        throw new Error('No se encontró información del cliente')
      }

      // Crear workbook
      const wb = XLSX.utils.book_new()

      // Hoja de resumen
      const summaryData = [
        ['Cliente', report.client.name],
        ['Email', report.client.email || 'N/A'],
        ['Fecha del Reporte', format(new Date(), 'dd/MM/yyyy HH:mm')],
        [''],
        ['Hardware'],
        ['Total', report.hardware.total],
        ['Activo', report.hardware.active],
        ['En Mantenimiento', report.hardware.maintenance],
        [''],
        ['Software'],
        ['Total', report.software.total],
        ['Activo', report.software.active],
        ['Por Expirar', report.software.expiring],
        [''],
        ['Credenciales'],
        ['Total', report.credentials.total],
        ['Último Acceso', report.credentials.lastAccess 
          ? format(new Date(report.credentials.lastAccess), 'dd/MM/yyyy HH:mm')
          : 'N/A'
        ]
      ]

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen')

      // Obtener datos detallados para otras hojas
      const [hardwareData, softwareData] = await Promise.all([
        supabase
          .from('hardware_assets')
          .select('name, brand, model, status, location, acquisition_date')
          .eq('client_id', clientId),
        
        supabase
          .from('software_licenses')
          .select('name, version, license_key, status, expiration_date')
          .eq('client_id', clientId)
      ])

      // Hoja de Hardware
      if (hardwareData.data && hardwareData.data.length > 0) {
        const hardwareRows = [
          ['Nombre', 'Marca', 'Modelo', 'Estado', 'Ubicación', 'Fecha Adquisición'],
          ...hardwareData.data.map(item => [
            item.name,
            item.brand,
            item.model,
            item.status,
            item.location || 'N/A',
            item.acquisition_date 
              ? format(new Date(item.acquisition_date), 'dd/MM/yyyy')
              : 'N/A'
          ])
        ]
        const hardwareWs = XLSX.utils.aoa_to_sheet(hardwareRows)
        XLSX.utils.book_append_sheet(wb, hardwareWs, 'Hardware')
      }

      // Hoja de Software
      if (softwareData.data && softwareData.data.length > 0) {
        const softwareRows = [
          ['Nombre', 'Versión', 'Clave de Licencia', 'Estado', 'Fecha Expiración'],
          ...softwareData.data.map(item => [
            item.name,
            item.version || 'N/A',
            item.license_key ? '***' : 'N/A', // Ocultar claves por seguridad
            item.status,
            item.expiration_date 
              ? format(new Date(item.expiration_date), 'dd/MM/yyyy')
              : 'N/A'
          ])
        ]
        const softwareWs = XLSX.utils.aoa_to_sheet(softwareRows)
        XLSX.utils.book_append_sheet(wb, softwareWs, 'Software')
      }

      // Generar y descargar archivo
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fileName = `reporte_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      
      saveAs(blob, fileName)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      throw new Error('Failed to export report to Excel')
    }
  }

  /**
   * Exporta resumen general a PDF
   */
  static async exportOverviewToPDF(): Promise<void> {
    try {
      const metrics = await this.getOverviewMetrics()
      const clientReports = await this.getClientReports()

      // Importar jsPDF dinámicamente
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      // Título
      doc.setFontSize(20)
      doc.text('Reporte General del Sistema', 20, 30)

      // Fecha
      doc.setFontSize(12)
      doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 45)

      // Métricas generales
      doc.setFontSize(16)
      doc.text('Métricas Generales', 20, 65)

      doc.setFontSize(12)
      let yPos = 80
      const metricsText = [
        `Total de Clientes: ${metrics.totalClients}`,
        `Hardware Activo: ${metrics.activeHardware}`,
        `Licencias Activas: ${metrics.activeLicenses}`,
        `Credenciales Totales: ${metrics.totalCredentials}`,
        `Actividad Reciente (7 días): ${metrics.recentActivity}`
      ]

      metricsText.forEach(text => {
        doc.text(text, 20, yPos)
        yPos += 15
      })

      // Top 10 clientes
      doc.setFontSize(16)
      doc.text('Top 10 Clientes por Actividad', 20, yPos + 20)
      yPos += 40

      const topClients = clientReports
        .map(report => ({
          name: report.client.name,
          total: report.hardware.total + report.software.total + report.credentials.total
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

      topClients.forEach((client, index) => {
        doc.text(`${index + 1}. ${client.name}: ${client.total} recursos`, 20, yPos)
        yPos += 12
      })

      // Descargar PDF
      doc.save(`reporte_general_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      throw new Error('Failed to export overview to PDF')
    }
  }
}