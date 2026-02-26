import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { saveAs } from 'file-saver'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { TicketWithRelations } from '@/lib/services/tickets'

export class TicketReportWord {
  static async generateReport(
    tickets: TicketWithRelations[],
    clientName: string,
    isGeneralReport: boolean = false,
    reportPeriodSlug?: string,
    reportPeriodLabel?: string
  ): Promise<void> {
    try {
      const stats = this.calculateStats(tickets)
      const titleBase = isGeneralReport ? 'Reporte General' : clientName
      const title = reportPeriodLabel ? `${titleBase} - ${reportPeriodLabel}` : titleBase

      const tableRows = [
        new TableRow({
          children: [
            this.createHeaderCell('N° Ticket'),
            this.createHeaderCell('Fecha'),
            this.createHeaderCell('Título'),
            this.createHeaderCell('Categoría'),
            this.createHeaderCell('Prioridad'),
            this.createHeaderCell('Estado'),
          ],
        }),
        ...tickets.map((ticket) =>
          new TableRow({
            children: [
              this.createBodyCell(ticket.ticket_number || `#${ticket.id.slice(-8)}`),
              this.createBodyCell(format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: es })),
              this.createBodyCell(ticket.title),
              this.createBodyCell(this.getCategoryLabel(ticket.category)),
              this.createBodyCell(this.getPriorityLabel(ticket.priority)),
              this.createBodyCell(this.getStatusLabel(ticket.status as string)),
            ],
          })
        ),
      ]

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: 'REPORTE DE TICKETS',
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 },
              }),
              new Paragraph({
                text: title,
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 },
              }),
              new Paragraph({
                text: `Generado: ${format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}`,
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'MÉTRICAS PRINCIPALES', bold: true }),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({ text: `Total Tickets: ${stats.total}` }),
              new Paragraph({ text: `Abiertos: ${stats.open}` }),
              new Paragraph({ text: `Pendiente Confirmación: ${stats.pendingConfirmation}` }),
              new Paragraph({ text: `Solucionados: ${stats.solved}` }),
              new Paragraph({ text: `Críticos: ${stats.critical}`, spacing: { after: 250 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows,
              }),
            ],
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      const periodSegment = reportPeriodSlug ? `-${reportPeriodSlug}` : ''
      const fileName = isGeneralReport
        ? `reporte-general-tickets${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.docx`
        : `reporte-tickets-${clientName.replace(/\s+/g, '-').toLowerCase()}${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.docx`

      saveAs(blob, fileName)
    } catch (error) {
      console.error('Error generando Word:', error)
      throw error
    }
  }

  private static createHeaderCell(text: string) {
    return new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: true })],
        }),
      ],
    })
  }

  private static createBodyCell(text: string) {
    return new TableCell({
      children: [new Paragraph({ text })],
    })
  }

  private static calculateStats(tickets: TicketWithRelations[]) {
    return {
      total: tickets.length,
      open: tickets.filter((t) => {
        const status = t.status as string
        return status === 'open' || status === 'in_progress'
      }).length,
      pendingConfirmation: tickets.filter((t) => t.status === 'pendiente_confirmacion').length,
      solved: tickets.filter((t) => {
        const status = t.status as string
        return status === 'solucionado' || status === 'resolved' || status === 'closed'
      }).length,
      critical: tickets.filter((t) => t.priority === 'critical').length,
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
      pendiente_confirmacion: 'Pendiente Confirmación',
      solucionado: 'Solucionado',
      resolved: 'Solucionado',
      closed: 'Solucionado',
    }
    return labels[status] || status
  }
}
