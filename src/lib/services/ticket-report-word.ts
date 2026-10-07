import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { saveAs } from 'file-saver'
import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from 'docx'
import type { TicketWithRelations } from '@/lib/services/tickets'
import { getReportLogoForWord } from '@/lib/services/report-logo'
import type { VisitReportRow } from '@/lib/services/visit-report-pdf'

const METRIC_COLORS = {
  total: '3498DB',
  open: 'E74C3C',
  pending: 'F1C40F',
  solved: '2ECC71',
  critical: 'C0392B',
} as const

export class TicketReportWord {
  static async generateReport(
    tickets: TicketWithRelations[],
    clientName: string,
    isGeneralReport: boolean = false,
    reportPeriodSlug?: string,
    reportPeriodLabel?: string,
    visitRows?: VisitReportRow[]
  ): Promise<void> {
    try {
      const isCombined = visitRows !== undefined
      const stats = this.calculateStats(tickets)
      const logo = await getReportLogoForWord(170)
      const titleBase = isGeneralReport ? 'Reporte General' : clientName
      const subtitle = reportPeriodLabel ? `${titleBase} - ${reportPeriodLabel}` : titleBase
      const mainTitle = isCombined ? 'REPORTE DE TICKETS Y VISITAS' : 'REPORTE DE TICKETS'

      const tableRows = [
        new TableRow({
          children: [
            this.createHeaderCell('N° Ticket'),
            this.createHeaderCell('Fecha'),
            this.createHeaderCell('Título'),
            this.createHeaderCell('Usuario afectado'),
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
              this.createBodyCell(ticket.usuario_afectado?.trim() || 'No especificado'),
              this.createBodyCell(this.getPriorityLabel(ticket.priority)),
              this.createBodyCell(this.getStatusLabel(ticket.status as string)),
            ],
          })
        ),
      ]

      const visitTableRows =
        isCombined && visitRows
          ? [
              new TableRow({
                children: [
                  this.createHeaderCell('Fecha'),
                  this.createHeaderCell('Cliente'),
                  this.createHeaderCell('Tipo'),
                  this.createHeaderCell('Estado'),
                  this.createHeaderCell('Técnico'),
                  this.createHeaderCell('Equipos'),
                  this.createHeaderCell('Detalle'),
                  this.createHeaderCell('Recomendaciones'),
                ],
              }),
              ...visitRows.map(
                (row) =>
                  new TableRow({
                    children: [
                      this.createBodyCell(row.fecha),
                      this.createBodyCell(row.cliente),
                      this.createBodyCell(row.tipo),
                      this.createBodyCell(row.estado),
                      this.createBodyCell(row.tecnico),
                      this.createBodyCell(row.equipos),
                      this.createBodyCell(row.detalle),
                      this.createBodyCell(row.recomendaciones),
                    ],
                  })
              ),
            ]
          : []

      const doc = new Document({
        sections: [
          {
            children: [
              ...(logo
                ? [
                    new Paragraph({
                      alignment: AlignmentType.LEFT,
                      spacing: { after: 180 },
                      children: [
                        new ImageRun({
                          data: logo.bytes.buffer as ArrayBuffer,
                          type: 'png',
                          transformation: { width: logo.width, height: logo.height },
                        }),
                      ],
                    }),
                  ]
                : []),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        shading: { fill: '2980B9', type: ShadingType.CLEAR },
                        columnSpan: 1,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 120, after: 80 },
                            children: [
                              new TextRun({
                                text: mainTitle,
                                bold: true,
                                size: 32,
                                color: 'FFFFFF',
                              }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 120 },
                            children: [
                              new TextRun({
                                text: subtitle,
                                size: 22,
                                color: 'FFFFFF',
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({
                children: [new TextRun({ text: 'MÉTRICAS PRINCIPALES', bold: true, color: '2980B9' })],
                spacing: { after: 120 },
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      this.createMetricCell('Total Tickets', stats.total, METRIC_COLORS.total),
                      this.createMetricCell('Abiertos', stats.open, METRIC_COLORS.open),
                      this.createMetricCell('Pend. Confirm.', stats.pendingConfirmation, METRIC_COLORS.pending),
                    ],
                  }),
                  new TableRow({
                    children: [
                      this.createMetricCell('Solucionados', stats.solved, METRIC_COLORS.solved, 50),
                      this.createMetricCell('Críticos', stats.critical, METRIC_COLORS.critical, 50),
                    ],
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'DISTRIBUCIÓN POR PRIORIDAD', bold: true, color: '2980B9' }),
                ],
                spacing: { before: 280, after: 120 },
              }),
              ...this.createDistributionLines(
                [
                  { label: 'Baja', value: stats.lowPriority, color: '2ECC71' },
                  { label: 'Media', value: stats.mediumPriority, color: '3498DB' },
                  { label: 'Alta', value: stats.highPriority, color: 'F39C12' },
                  { label: 'Crítica', value: stats.criticalPriority, color: 'E74C3C' },
                ],
                stats.total
              ),
              new Paragraph({
                children: [
                  new TextRun({ text: 'DISTRIBUCIÓN POR CATEGORÍA', bold: true, color: '2980B9' }),
                ],
                spacing: { before: 200, after: 120 },
              }),
              ...this.createDistributionLines(
                [
                  { label: 'Hardware', value: stats.hardware, color: '9B59B6' },
                  { label: 'Software', value: stats.software, color: '3498DB' },
                  { label: 'Red', value: stats.network, color: '1ABC9C' },
                  { label: 'Accesos', value: stats.access, color: 'F1C40F' },
                  { label: 'Otro', value: stats.other, color: '95A5A6' },
                ],
                stats.total
              ),
              new Paragraph({
                children: [new TextRun({ text: 'LISTADO DE TICKETS', bold: true, color: '2980B9' })],
                spacing: { before: 280, after: 120 },
              }),
              ...(tickets.length === 0
                ? [
                    new Paragraph({
                      text: 'No se registraron tickets en el periodo seleccionado.',
                      spacing: { after: 200 },
                    }),
                  ]
                : []),
              ...(tickets.length > 0
                ? [
                    new Table({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      rows: tableRows,
                    }),
                  ]
                : []),
              ...(isCombined
                ? [
                    new Paragraph({
                      children: [new TextRun({ text: 'LISTADO DE VISITAS', bold: true, color: '2980B9' })],
                      spacing: { before: 300, after: 150 },
                    }),
                    ...(visitRows!.length === 0
                      ? [
                          new Paragraph({
                            text: 'No se registraron visitas en el periodo seleccionado.',
                            spacing: { after: 200 },
                          }),
                        ]
                      : [
                          new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: visitTableRows,
                          }),
                        ]),
                  ]
                : []),
            ],
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      const periodSegment = reportPeriodSlug ? `-${reportPeriodSlug}` : ''
      const fileName = isCombined
        ? isGeneralReport
          ? `reporte-general-tickets-visitas${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.docx`
          : `reporte-tickets-visitas-${clientName.replace(/\s+/g, '-').toLowerCase()}${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.docx`
        : isGeneralReport
          ? `reporte-general-tickets${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.docx`
          : `reporte-tickets-${clientName.replace(/\s+/g, '-').toLowerCase()}${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.docx`

      saveAs(blob, fileName)
    } catch (error) {
      console.error('Error generando Word:', error)
      throw error
    }
  }

  private static createMetricCell(
    label: string,
    value: number,
    fillHex: string,
    widthPercent = 33
  ) {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlignTable.CENTER,
      shading: { fill: fillHex, type: ShadingType.CLEAR },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(value), bold: true, size: 36, color: 'FFFFFF' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: label, size: 14, color: 'FFFFFF' })],
        }),
      ],
    })
  }

  private static createDistributionLines(
    items: { label: string; value: number; color: string }[],
    total: number
  ) {
    return items.map(
      (item) =>
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: '■ ', color: item.color }),
            new TextRun({
              text: `${item.label}: ${item.value} (${total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'}%)`,
            }),
          ],
        })
    )
  }

  private static createHeaderCell(text: string) {
    return new TableCell({
      shading: { fill: '2980B9', type: ShadingType.CLEAR },
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: true, color: 'FFFFFF' })],
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
      lowPriority: tickets.filter((t) => t.priority === 'low').length,
      mediumPriority: tickets.filter((t) => t.priority === 'medium').length,
      highPriority: tickets.filter((t) => t.priority === 'high').length,
      criticalPriority: tickets.filter((t) => t.priority === 'critical').length,
      hardware: tickets.filter((t) => t.category === 'hardware').length,
      software: tickets.filter((t) => t.category === 'software').length,
      network: tickets.filter((t) => t.category === 'network').length,
      access: tickets.filter((t) => t.category === 'access').length,
      other: tickets.filter((t) => t.category === 'other').length,
    }
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
