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
  buildTicketKpiReportData,
  formatMinutesToReadable,
} from '@/lib/services/ticket-kpi-report-utils'
import { getReportLogoForWord } from '@/lib/services/report-logo'

interface KpiReportWordOptions {
  clientName: string
  isGeneralReport?: boolean
  reportPeriodSlug?: string
  startDate?: string
  endDate?: string
  assignedUserNames?: Record<string, string>
}

const getReportMonthLabel = (startDate?: string, endDate?: string) => {
  if (startDate && endDate && startDate.slice(0, 7) === endDate.slice(0, 7)) {
    return format(new Date(`${startDate}T00:00:00`), 'MMMM yyyy', { locale: es })
  }
  return 'el periodo seleccionado'
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
      const monthLabel = getReportMonthLabel(options.startDate, options.endDate)
      const clientLabel = options.isGeneralReport ? 'Todos los clientes' : options.clientName

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
                spacing: { after: 120 },
              }),
              new Paragraph({
                text: `Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`,
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
              new Paragraph({ text: '- Disponibilidad de servicios: No se registraron eventos nivel Critico P1; lo cual se traduce en que no hubo interrupciones del servicio, continuando con la disponibilidad del servicio en un nivel superior al 97.5% propuesto para los periodos operativos.' }),
              new Paragraph({
                text: `- Cumplimiento en Tiempos de resolucion: ${report.resolutionCompliance.percentage}% (${report.resolutionCompliance.within}/${report.resolutionCompliance.evaluated}) de los casos se resolvieron dentro de los tiempos propuestos en los SLA, dentro de los cuales se dividieron en:`,
              }),
              ...report.priorityBuckets.map((bucket) =>
                new Paragraph({ text: `  - Criticidad ${bucket.code}: ${bucket.resolutionWithin}/${bucket.resolutionEvaluated} dentro de ${bucket.resolutionTargetLabel}.` })
              ),
              new Paragraph({
                text: `- Cumplimiento en Tiempos de respuesta: ${report.responseCompliance.percentage}% (${report.responseCompliance.within}/${report.responseCompliance.evaluated}) dentro del tiempo objetivo por nivel (promedio general de respuesta: ${formatMinutesToReadable(report.responseCompliance.averageMinutes)}).`,
              }),
              new Paragraph({
                text: '- Seguridad: No se presento ningun incidente de seguridad mayor que afectara la operacion, se implementaron nuevas politicas con mayor restriccion sobre la navegacion en redes sociales y el bloqueo del uso de dispositivos de almacenamiento externo por USB.',
              }),
              new Paragraph({
                text: '- Productividad: Durante el mes de marzo se aprovisionaron 2 equipos nuevos, 2 docking station y 2 cargadores adicionales (para la direccion ejecutiva), ademas se han programado revisiones sobre equipos, infraestructura general y copias de seguridad en el servidor de aplicaciones, asi como ajustes en las politicas de dominio, para un total de 10 atenciones en sitio. Como ultimo anexo, se programaron 4 visitas al domicilio del director ejecutivo para la instalacion de 2 Access Point como solucion de red y la entrega de un equipo para uso personal junto con su respectivo docking.',
                spacing: { after: 180 },
              }),
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
