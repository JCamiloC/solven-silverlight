/**
 * Servicio para generar PDF del Reporte de Tickets
 * Similar al reporte de hardware pero para tickets
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TicketWithRelations } from '@/lib/services/tickets'
import { getReportLogoForPdf } from '@/lib/services/report-logo'
import type { VisitReportRow } from '@/lib/services/visit-report-pdf'

export class TicketReportPDF {
  /**
   * Genera el reporte de tickets en PDF
   */
  static async generateReport(
    tickets: TicketWithRelations[],
    clientName: string,
    isGeneralReport: boolean = false,
    reportPeriodSlug?: string,
    reportPeriodLabel?: string,
    visitRows?: VisitReportRow[]
  ): Promise<void> {
    const isCombined = visitRows !== undefined
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
      const pageWidth = doc.internal.pageSize.width
      const margin = 15

      // Calcular estadísticas
      const stats = this.calculateStats(tickets)

      const logo = await getReportLogoForPdf(38)
      const logoHeight = logo?.height || 0
      const headerHeight = 52
      const contentTop = headerHeight + 10
      const titleBase = isGeneralReport ? 'Reporte General' : clientName
      const subtitle = reportPeriodLabel ? `${titleBase} - ${reportPeriodLabel}` : titleBase
      const mainTitle = isCombined ? 'REPORTE DE TICKETS Y VISITAS' : 'REPORTE DE TICKETS'

      doc.setTextColor(0, 0, 0)
      yPos = contentTop

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
          yPos = contentTop
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
        const priorityPct =
          stats.total > 0 ? ((item.value / stats.total) * 100).toFixed(1) : '0.0'
        doc.text(`${item.label}: ${item.value} (${priorityPct}%)`, margin + 15, yPos + 4)
        
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
        const categoryPct =
          stats.total > 0 ? ((item.value / stats.total) * 100).toFixed(1) : '0.0'
        doc.text(`${item.label}: ${item.value} (${categoryPct}%)`, margin + 15, yPos + 4)
        
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

      if (tickets.length === 0) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text('No se registraron tickets en el periodo seleccionado.', margin, yPos)
        yPos += 12
        doc.setTextColor(0, 0, 0)
      }

      const tableData = tickets.map(ticket => [
        ticket.ticket_number || `#${ticket.id.slice(-8)}`,
        format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: es }),
        ticket.title,
        ticket.usuario_afectado?.trim() || 'No especificado',
        this.getPriorityLabel(ticket.priority),
        this.getStatusLabel(ticket.status),
      ])

      if (tableData.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['N° Ticket', 'Fecha', 'Título', 'Usuario afectado', 'Prioridad', 'Estado']],
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
            overflow: 'linebreak',
          },
          styles: {
            overflow: 'linebreak',
            cellPadding: 2,
            valign: 'middle',
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 22 },
            2: { cellWidth: 60 },
            3: { cellWidth: 22 },
            4: { cellWidth: 22 },
            5: { cellWidth: 25 },
          },
          margin: { top: contentTop, left: margin, right: margin, bottom: 18 },
        })

        yPos = (doc as any).lastAutoTable?.finalY || yPos + 20
      }

      if (isCombined && visitRows) {
        checkNewPage(60)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('LISTADO DE VISITAS', margin, yPos)
        yPos += 5

        if (visitRows.length === 0) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          doc.text('No se registraron visitas en el periodo seleccionado.', margin, yPos)
          yPos += 12
          doc.setTextColor(0, 0, 0)
        } else {
          const includeClient = isGeneralReport
          const visitHead = includeClient
            ? ['Fecha', 'Cliente', 'Tipo', 'Estado', 'Técnico', 'Equipos', 'Detalle']
            : ['Fecha', 'Tipo', 'Estado', 'Técnico', 'Equipos', 'Detalle', 'Recomendaciones']

          const visitBody = visitRows.map((row) =>
            includeClient
              ? [row.fecha, row.cliente, row.tipo, row.estado, row.tecnico, row.equipos, row.detalle]
              : [
                  row.fecha,
                  row.tipo,
                  row.estado,
                  row.tecnico,
                  row.equipos,
                  row.detalle,
                  row.recomendaciones,
                ]
          )

          autoTable(doc, {
            startY: yPos,
            head: [visitHead],
            body: visitBody,
            theme: 'striped',
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: 255,
              fontSize: 8,
              fontStyle: 'bold',
            },
            bodyStyles: {
              fontSize: 7,
              overflow: 'linebreak',
              cellPadding: 2,
            },
            styles: {
              overflow: 'linebreak',
              valign: 'middle',
            },
            margin: { top: contentTop, left: margin, right: margin, bottom: 18 },
          })

          yPos = (doc as any).lastAutoTable?.finalY || yPos + 20
        }
      }

      const totalPages = (doc.internal as any).getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        this.drawPageHeader(doc, {
          pageWidth,
          headerHeight,
          logo,
          logoHeight,
          mainTitle,
          subtitle,
        })
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, {
          align: 'center',
        })
      }

      // Guardar PDF
      const periodSegment = reportPeriodSlug ? `-${reportPeriodSlug}` : ''
      const fileName = isCombined
        ? isGeneralReport
          ? `reporte-general-tickets-visitas${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
          : `reporte-tickets-visitas-${clientName.replace(/\s+/g, '-').toLowerCase()}${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
        : isGeneralReport
          ? `reporte-general-tickets${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
          : `reporte-tickets-${clientName.replace(/\s+/g, '-').toLowerCase()}${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      
      doc.save(fileName)
    } catch (error) {
      console.error('Error generando PDF:', error)
      throw error
    }
  }

  private static drawPageHeader(
    doc: any,
    options: {
      pageWidth: number
      headerHeight: number
      logo: Awaited<ReturnType<typeof getReportLogoForPdf>>
      logoHeight: number
      mainTitle: string
      subtitle: string
    }
  ) {
    const { pageWidth, headerHeight, logo, logoHeight, mainTitle, subtitle } = options

    doc.setFillColor(41, 128, 185)
    doc.rect(0, 0, pageWidth, headerHeight, 'F')

    if (logo) {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(8, 6, logo.width + 4, logo.height + 4, 2, 2, 'F')
      doc.addImage(logo.dataUrl, 'PNG', 10, 8, logo.width, logo.height)
    }

    const textX = pageWidth / 2
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(mainTitle, textX, 30, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, textX, 42, { align: 'center' })
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
