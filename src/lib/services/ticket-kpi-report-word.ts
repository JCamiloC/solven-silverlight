import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { saveAs } from 'file-saver'
import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { TicketWithRelations } from '@/lib/services/tickets'
import {
  buildKpiNarrativeParagraphs,
  buildTicketKpiReportData,
  formatMinutesToReadable,
  getKpiReportPeriodLabel,
} from '@/lib/services/ticket-kpi-report-utils'
import { getReportLogoForWord } from '@/lib/services/report-logo'
import type { VisitReportRow } from '@/lib/services/visit-report-pdf'

interface KpiReportWordOptions {
  clientName: string
  isGeneralReport?: boolean
  reportPeriodSlug?: string
  startDate?: string
  endDate?: string
  assignedUserNames?: Record<string, string>
  visitHistory?: VisitReportRow[]
}

const createHeaderCell = (text: string) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true })],
      }),
    ],
  })

const createBodyCell = (text: string) =>
  new TableCell({
    children: [new Paragraph({ text })],
  })

export class TicketKpiReportWord {
  static async generateReport(tickets: TicketWithRelations[], options: KpiReportWordOptions): Promise<void> {
    try {
      const report = buildTicketKpiReportData(tickets, options.assignedUserNames)
      const logo = await getReportLogoForWord(170)
      const monthLabel = getKpiReportPeriodLabel(options.startDate, options.endDate)
      const clientLabel = options.isGeneralReport ? 'Todos los clientes' : options.clientName
      const visitHistory = options.visitHistory || []
      const narratives = buildKpiNarrativeParagraphs(report, visitHistory, monthLabel)

      const kpiTableRows = [
        new TableRow({
          children: [
            createHeaderCell('FECHA'),
            createHeaderCell('ACTIVIDAD'),
            createHeaderCell('T.RTA'),
            createHeaderCell('T.RES'),
            createHeaderCell('Criticidad'),
            createHeaderCell('Cumple'),
            createHeaderCell('PERSONA QUE RECIBE'),
          ],
        }),
        ...report.rows.map((row) =>
          new TableRow({
            children: [
              createBodyCell(row.fecha),
              createBodyCell(row.actividad),
              createBodyCell(row.tiempoRespuesta),
              createBodyCell(row.tiempoSolucion),
              createBodyCell(row.criticidad),
              createBodyCell(row.cumple),
              createBodyCell(row.personaQueRecibe),
            ],
          })
        ),
      ]

      const includeClient = Boolean(options.isGeneralReport)
      const visitTableRows =
        visitHistory.length > 0
          ? [
              new TableRow({
                children: (includeClient
                  ? ['FECHA', 'CLIENTE', 'TIPO', 'ESTADO', 'TECNICO', 'DETALLE']
                  : ['FECHA', 'TIPO', 'ESTADO', 'TECNICO', 'EQUIPOS', 'DETALLE']
                ).map((header) => createHeaderCell(header)),
              }),
              ...visitHistory.map((row) =>
                new TableRow({
                  children: (includeClient
                    ? [row.fecha, row.cliente, row.tipo, row.estado, row.tecnico, row.detalle]
                    : [row.fecha, row.tipo, row.estado, row.tecnico, row.equipos, row.detalle]
                  ).map((cell) => createBodyCell(cell)),
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
                      spacing: { after: 220 },
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
              new Paragraph({
                text: 'REPORTE DE KPIS',
                alignment: AlignmentType.CENTER,
                spacing: { after: 240 },
              }),
              new Paragraph({ text: `Bogota, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}` }),
              new Paragraph({ text: 'Senores' }),
              new Paragraph({ text: clientLabel }),
              new Paragraph({
                text: `Muy atentamente me dirijo a ustedes con el fin de detallar los servicios prestados durante ${monthLabel} a su empresa junto con las metricas de los ANS:`,
                spacing: { after: 180 },
              }),
              new Paragraph({
                children: [new TextRun({ text: 'Metricas principales', bold: true })],
              }),
              new Paragraph({ text: `Total tickets: ${report.total}` }),
              new Paragraph({ text: `Abiertos: ${report.mainMetrics.open}` }),
              new Paragraph({ text: `Pendiente confirmacion: ${report.mainMetrics.pendingConfirmation}` }),
              new Paragraph({ text: `Solucionados: ${report.mainMetrics.solved}` }),
              new Paragraph({ text: 'Distribucion por prioridad', spacing: { before: 100 } }),
              new Paragraph({ text: `P1 (Critico): ${report.priorityDistribution.P1}` }),
              new Paragraph({ text: `P2 (Alto): ${report.priorityDistribution.P2}` }),
              new Paragraph({ text: `P3 (Medio): ${report.priorityDistribution.P3}` }),
              new Paragraph({ text: `P4 (Bajo): ${report.priorityDistribution.P4}` }),
              new Paragraph({ text: 'Distribucion por categoria', spacing: { before: 100 } }),
              new Paragraph({ text: `Hardware: ${report.categoryDistribution.Hardware}` }),
              new Paragraph({ text: `Software: ${report.categoryDistribution.Software}` }),
              new Paragraph({ text: `Red: ${report.categoryDistribution.Red}` }),
              new Paragraph({ text: `Accesos: ${report.categoryDistribution.Accesos}` }),
              new Paragraph({ text: `Otro: ${report.categoryDistribution.Otro}`, spacing: { after: 160 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: kpiTableRows,
              }),
              new Paragraph({ text: '', spacing: { after: 120 } }),
              new Paragraph({
                text: 'Con base en la informacion contenida anteriormente y respondiendo a las metricas de exito propuestas en los SLAs, a continuacion, presentamos el comportamiento de la operacion durante el mes:',
                spacing: { after: 100 },
              }),
              new Paragraph({ text: narratives.availability }),
              new Paragraph({
                text: `- Cumplimiento en Tiempos de resolucion: ${report.resolutionCompliance.percentage}% (${report.resolutionCompliance.within}/${report.resolutionCompliance.evaluated}) de los casos se resolvieron dentro de los tiempos propuestos en los SLA, dentro de los cuales se dividieron en:`,
              }),
              ...report.priorityBuckets.map((bucket) =>
                new Paragraph({ text: `  - Criticidad ${bucket.code}: ${bucket.resolutionWithin}/${bucket.resolutionEvaluated} dentro de ${bucket.resolutionTargetLabel}.` })
              ),
              new Paragraph({
                text: `- Cumplimiento en Tiempos de respuesta: ${report.responseCompliance.percentage}% (${report.responseCompliance.within}/${report.responseCompliance.evaluated}) dentro del tiempo objetivo por nivel (promedio general de respuesta: ${formatMinutesToReadable(report.responseCompliance.averageMinutes)}).`,
              }),
              new Paragraph({ text: narratives.security }),
              new Paragraph({
                text: narratives.productivity,
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [new TextRun({ text: 'Historico de visitas', bold: true })],
                spacing: { before: 120, after: 80 },
              }),
              ...(visitHistory.length === 0
                ? [
                    new Paragraph({
                      text: 'No se registraron visitas en el periodo seleccionado.',
                      spacing: { after: 180 },
                    }),
                  ]
                : [
                    new Table({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      rows: visitTableRows,
                    }),
                    new Paragraph({ text: '', spacing: { after: 180 } }),
                  ]),
              new Paragraph({ text: 'Rodrigo Andres Quintero G.', spacing: { after: 80 } }),
              new Paragraph({ text: 'Director General - Silverlight Colombia' }),
            ],
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      const periodSegment = options.reportPeriodSlug ? `-${options.reportPeriodSlug}` : ''
      const fileName = options.isGeneralReport
        ? `reporte-general-kpis${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.docx`
        : `reporte-kpis-${options.clientName.replace(/\s+/g, '-').toLowerCase()}${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.docx`

      saveAs(blob, fileName)
    } catch (error) {
      console.error('Error generando reporte KPI Word:', error)
      throw error
    }
  }
}
