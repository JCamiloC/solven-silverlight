import { createClient } from '@/lib/supabase/client'
import { MaintenanceReportFilters, MaintenanceReportRow } from '@/types'
import { getSoftwareDisplayName } from '@/lib/utils'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { es } from 'date-fns/locale'

const supabase = createClient()

export class MaintenanceReportService {
  /**
   * Obtiene el reporte de mantenimiento de hardware para un cliente y mes específico
   */
  static async getHardwareMaintenanceReport(
    filters: MaintenanceReportFilters
  ): Promise<MaintenanceReportRow[]> {
    try {
      const { clientId, year, month } = filters

      // Calcular rango de fechas del mes
      const startDate = startOfMonth(new Date(year, month - 1))
      const endDate = endOfMonth(new Date(year, month - 1))

      // Obtener seguimientos del mes con información de hardware
      const { data: seguimientos, error } = await supabase
        .from('hardware_seguimientos')
        .select(`
          id,
          hardware_id,
          tipo,
          detalle,
          actividades,
          fecha_registro,
          hardware:hardware_assets!hardware_seguimientos_hardware_id_fkey (
            id,
            name,
            type,
            procesador,
            memoria_ram,
            disco_duro,
            sistema_operativo,
            ms_office,
            antivirus,
            persona_responsable,
            otro_periferico,
            client_id
          )
        `)
        .gte('fecha_registro', startDate.toISOString())
        .lte('fecha_registro', endDate.toISOString())
        .order('fecha_registro', { ascending: true })

      if (error) throw error

      // Filtrar por cliente y transformar datos
      const filteredData = seguimientos?.filter(
        (seg: any) => seg.hardware?.client_id === clientId
      ) || []

      return filteredData.map((seg: any, index: number) => ({
        rowNumber: index + 1,
        usuario: seg.hardware?.persona_responsable || 'No asignado',
        equipoNombre: seg.hardware?.name || 'Sin nombre',
        tipo: seg.hardware?.type || 'N/A',
        procesador: seg.hardware?.procesador || 'No especificado',
        ram: seg.hardware?.memoria_ram || 'No especificada',
        disco: seg.hardware?.disco_duro || 'No especificado',
        tipoPantalla: seg.hardware?.otro_periferico || 'N/A',
        office: getSoftwareDisplayName(seg.hardware?.ms_office),
        antivirus: getSoftwareDisplayName(seg.hardware?.antivirus),
        sistemaOperativo: getSoftwareDisplayName(seg.hardware?.sistema_operativo),
        detalleSeguimiento: seg.detalle || '',
        fechaSeguimiento: seg.fecha_registro,
      }))
    } catch (error) {
      console.error('Error getting hardware maintenance report:', error)
      throw new Error('Error al obtener el reporte de mantenimiento')
    }
  }

  /**
   * Genera PDF del reporte de mantenimiento de hardware
   */
  static async generateMaintenancePDF(
    rows: MaintenanceReportRow[],
    clientName: string,
    month: number,
    year: number
  ): Promise<void> {
    try {
      const { default: jsPDF } = await import('jspdf')
      await import('jspdf-autotable')

      const doc = new jsPDF('landscape', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 10

      // Título
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE DE MANTENIMIENTO - HARDWARE', pageWidth / 2, 15, { align: 'center' })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: es })
      doc.text(`Cliente: ${clientName}`, margin, 25)
      doc.text(`Período: ${monthName}`, margin, 31)

      // Preparar datos para la tabla
      const tableData = rows.map(row => [
        row.rowNumber,
        row.usuario,
        row.equipoNombre,
        row.tipo,
        row.procesador,
        row.ram,
        row.disco,
        row.tipoPantalla,
        row.office,
        row.antivirus,
        row.sistemaOperativo,
        row.detalleSeguimiento,
      ])

      // Generar tabla
      ;(doc as any).autoTable({
        head: [[
          '#',
          'Usuario',
          'Nombre',
          'Tipo',
          'Procesador',
          'RAM',
          'Disco',
          'Pantalla',
          'Office',
          'Antivirus',
          'S.O.',
          'Detalle Mantenimiento',
        ]],
        body: tableData,
        startY: 38,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 15 },
          4: { cellWidth: 20 },
          5: { cellWidth: 15 },
          6: { cellWidth: 15 },
          7: { cellWidth: 15 },
          8: { cellWidth: 20 },
          9: { cellWidth: 20 },
          10: { cellWidth: 20 },
          11: { cellWidth: 'auto' },
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      })

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - margin,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        )
        doc.text(
          `Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
          margin,
          doc.internal.pageSize.getHeight() - 10
        )
      }

      // Descargar PDF
      const filename = `Reporte_Mantenimiento_${clientName.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.pdf`
      doc.save(filename)
    } catch (error) {
      console.error('Error generating maintenance PDF:', error)
      throw new Error('Error al generar el PDF del reporte')
    }
  }

  /**
   * Exporta el reporte a Excel
   */
  static async exportToExcel(
    rows: MaintenanceReportRow[],
    clientName: string,
    month: number,
    year: number
  ): Promise<void> {
    try {
      const XLSX = await import('xlsx')
      const { saveAs } = await import('file-saver')

      const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: es })

      // Preparar datos
      const data = rows.map(row => ({
        '#': row.rowNumber,
        'Usuario': row.usuario,
        'Nombre Equipo': row.equipoNombre,
        'Tipo': row.tipo,
        'Procesador': row.procesador,
        'RAM': row.ram,
        'Disco': row.disco,
        'Pantalla': row.tipoPantalla,
        'Office': row.office,
        'Antivirus': row.antivirus,
        'Sistema Operativo': row.sistemaOperativo,
        'Detalle Mantenimiento': row.detalleSeguimiento,
      }))

      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Mantenimiento')

      // Ajustar anchos de columna
      const colWidths = [
        { wch: 5 },  // #
        { wch: 20 }, // Usuario
        { wch: 25 }, // Nombre
        { wch: 15 }, // Tipo
        { wch: 25 }, // Procesador
        { wch: 15 }, // RAM
        { wch: 15 }, // Disco
        { wch: 15 }, // Pantalla
        { wch: 20 }, // Office
        { wch: 20 }, // Antivirus
        { wch: 20 }, // S.O.
        { wch: 50 }, // Detalle
      ]
      ws['!cols'] = colWidths

      // Generar archivo
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      const filename = `Reporte_Mantenimiento_${clientName.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.xlsx`
      saveAs(blob, filename)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      throw new Error('Error al exportar a Excel')
    }
  }
}
