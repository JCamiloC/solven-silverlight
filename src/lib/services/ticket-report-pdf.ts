/**
 * Servicio para generar PDF del Reporte de Tickets
 * Similar al reporte de hardware pero para tickets
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TicketWithRelations } from '@/lib/services/tickets'

export class TicketReportPDF {
  /**
   * Genera el reporte de tickets en PDF
   */
  static async generateReport(
    tickets: TicketWithRelations[],
    clientName: string,
    isGeneralReport: boolean = false,
    reportPeriodSlug?: string,
    reportPeriodLabel?: string
  ): Promise<void> {
    try {
      // Importar jsPDF
      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default
      
      // Importar la función autoTable
      const { autoTable } = await import('jspdf-autotable')
      
      // Crear documento
      const doc: any = new jsPDF()
      
      let yPos = 20
      const pageHeight = doc.internal.pageSize.height
      const margin = 15
      const maxWidth = 180

      // Calcular estadísticas
      const stats = this.calculateStats(tickets)

      // ==========================================
      // ENCABEZADO PRINCIPAL
      // ==========================================
      doc.setFillColor(41, 128, 185)
      doc.rect(0, 0, 210, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(26)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE DE TICKETS', 105, 18, { align: 'center' })
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      const titleBase = isGeneralReport ? 'Reporte General' : clientName
      const title = reportPeriodLabel ? `${titleBase} - ${reportPeriodLabel}` : titleBase
      doc.text(title, 105, 28, { align: 'center' })

      doc.setFontSize(10)
      doc.text(`Generado: ${format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}`, 105, 35, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      yPos = 50

      // ==========================================
      // MÉTRICAS PRINCIPALES
      // ==========================================
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('MÉTRICAS PRINCIPALES', margin, yPos)
      yPos += 10

      // Crear grid de métricas (2x3)
      const metrics = [
        { label: 'Total Tickets', value: stats.total, color: [52, 152, 219] },
        { label: 'Abiertos', value: stats.open, color: [231, 76, 60] },
        { label: 'Pend. Confirm.', value: stats.pendingConfirmation, color: [241, 196, 15] },
        { label: 'Solucionados', value: stats.solved, color: [46, 204, 113] },
        { label: 'Críticos', value: stats.critical, color: [192, 57, 43] },
      ]

      const boxWidth = 42
      const boxHeight = 25
      const startX = margin
      let currentX = startX
      let currentY = yPos

      metrics.forEach((metric, index) => {
        if (index > 0 && index % 3 === 0) {
          currentX = startX
          currentY += boxHeight + 5
        }

        // Fondo de la caja
        doc.setFillColor(...metric.color)
        doc.roundedRect(currentX, currentY, boxWidth, boxHeight, 3, 3, 'F')

        // Valor
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text(String(metric.value), currentX + boxWidth / 2, currentY + 12, { align: 'center' })

        // Label
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(metric.label, currentX + boxWidth / 2, currentY + 20, { align: 'center' })

        currentX += boxWidth + 4
      })

      yPos = currentY + boxHeight + 15

      // Función helper para verificar espacio
      const checkNewPage = (neededSpace: number) => {
        if (yPos + neededSpace > pageHeight - 20) {
          doc.addPage()
          yPos = 20
          return true
        }
        return false
      }

      // ==========================================
      // DISTRIBUCIÓN POR PRIORIDAD
      // ==========================================
      checkNewPage(40)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('DISTRIBUCIÓN POR PRIORIDAD', margin, yPos)
      yPos += 8

      const priorityData = [
        { label: 'Baja', value: stats.lowPriority, color: [46, 204, 113] },
        { label: 'Media', value: stats.mediumPriority, color: [52, 152, 219] },
        { label: 'Alta', value: stats.highPriority, color: [243, 156, 18] },
        { label: 'Crítica', value: stats.criticalPriority, color: [231, 76, 60] },
      ]

      priorityData.forEach((item, index) => {
        doc.setFillColor(...item.color)
        doc.rect(margin, yPos, 10, 6, 'F')
        
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`${item.label}: ${item.value} (${((item.value / stats.total) * 100).toFixed(1)}%)`, margin + 15, yPos + 4)
        
        yPos += 8
      })

      yPos += 5

      // ==========================================
      // DISTRIBUCIÓN POR CATEGORÍA
      // ==========================================
      checkNewPage(40)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('DISTRIBUCIÓN POR CATEGORÍA', margin, yPos)
      yPos += 8

      const categoryData = [
        { label: 'Hardware', value: stats.hardware, color: [155, 89, 182] },
        { label: 'Software', value: stats.software, color: [52, 152, 219] },
        { label: 'Red', value: stats.network, color: [26, 188, 156] },
        { label: 'Accesos', value: stats.access, color: [241, 196, 15] },
        { label: 'Otro', value: stats.other, color: [149, 165, 166] },
      ]

      categoryData.forEach((item) => {
        doc.setFillColor(...item.color)
        doc.rect(margin, yPos, 10, 6, 'F')
        
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`${item.label}: ${item.value} (${((item.value / stats.total) * 100).toFixed(1)}%)`, margin + 15, yPos + 4)
        
        yPos += 8
      })

      yPos += 10

      // ==========================================
      // TABLA DE TICKETS
      // ==========================================
      checkNewPage(60)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('LISTADO DE TICKETS', margin, yPos)
      yPos += 5

      const tableData = tickets.map(ticket => [
        ticket.ticket_number || `#${ticket.id.slice(-8)}`,
        format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: es }),
        ticket.title.length > 40 ? ticket.title.substring(0, 37) + '...' : ticket.title,
        this.getCategoryLabel(ticket.category),
        this.getPriorityLabel(ticket.priority),
        this.getStatusLabel(ticket.status),
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['N° Ticket', 'Fecha', 'Título', 'Categoría', 'Prioridad', 'Estado']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 22 },
          2: { cellWidth: 60 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 25 },
        },
        margin: { left: margin, right: margin },
      })

      // Actualizar yPos después de la tabla
      yPos = (doc as any).lastAutoTable?.finalY || yPos + 20

      // ==========================================
      // PIE DE PÁGINA
      // ==========================================
      const totalPages = (doc.internal as any).getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `Página ${i} de ${totalPages}`,
          105,
          pageHeight - 10,
          { align: 'center' }
        )
      }

      // Guardar PDF
      const periodSegment = reportPeriodSlug ? `-${reportPeriodSlug}` : ''
      const fileName = isGeneralReport 
        ? `reporte-general-tickets${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
        : `reporte-tickets-${clientName.replace(/\s+/g, '-').toLowerCase()}${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      
      doc.save(fileName)
    } catch (error) {
      console.error('Error generando PDF:', error)
      throw error
    }
  }

  /**
   * Calcula estadísticas de los tickets
   */
  private static calculateStats(tickets: TicketWithRelations[]) {
    return {
      total: tickets.length,
      open: tickets.filter(t => {
        const status = t.status as string
        return status === 'open' || status === 'in_progress'
      }).length,
      pendingConfirmation: tickets.filter(t => t.status === 'pendiente_confirmacion').length,
      solved: tickets.filter(t => {
        const status = t.status as string
        return status === 'solucionado' || status === 'resolved' || status === 'closed'
      }).length,
      critical: tickets.filter(t => t.priority === 'critical').length,
      lowPriority: tickets.filter(t => t.priority === 'low').length,
      mediumPriority: tickets.filter(t => t.priority === 'medium').length,
      highPriority: tickets.filter(t => t.priority === 'high').length,
      criticalPriority: tickets.filter(t => t.priority === 'critical').length,
      hardware: tickets.filter(t => t.category === 'hardware').length,
      software: tickets.filter(t => t.category === 'software').length,
      network: tickets.filter(t => t.category === 'network').length,
      access: tickets.filter(t => t.category === 'access').length,
      other: tickets.filter(t => t.category === 'other').length,
    }
  }

  private static getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      hardware: 'Hardware',
      software: 'Software',
      network: 'Red',
      access: 'Accesos',
      other: 'Otro',
    }
    return labels[category] || category
  }

  private static getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      critical: 'Crítica',
    }
    return labels[priority] || priority
  }

  private static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: 'Abierto',
      in_progress: 'Abierto',
      pendiente_confirmacion: 'Pdte. Confirm.',
      solucionado: 'Solucionado',
      resolved: 'Solucionado',
      closed: 'Solucionado',
    }
    return labels[status] || status
  }
}
