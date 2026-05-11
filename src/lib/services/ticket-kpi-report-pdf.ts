import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TicketWithRelations } from '@/lib/services/tickets'
import {
  buildTicketKpiReportData,
  formatMinutesToReadable,
} from '@/lib/services/ticket-kpi-report-utils'
import { getReportLogoForPdf } from '@/lib/services/report-logo'

interface KpiReportOptions {
  clientName: string
  isGeneralReport?: boolean
  reportPeriodSlug?: string
  reportPeriodLabel?: string
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

export class TicketKpiReportPDF {
  static async generateReport(tickets: TicketWithRelations[], options: KpiReportOptions): Promise<void> {
    try {
      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default
      const { autoTable } = await import('jspdf-autotable')

      const report = buildTicketKpiReportData(tickets, options.assignedUserNames)
      const doc: any = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      const margin = 15
      const maxWidth = 180
      let yPos = 18

      const logo = await getReportLogoForPdf(40)
      const logoHeight = logo?.height || 0

      const drawHeaderLogo = () => {
        if (!logo) return
        doc.setFillColor(248, 249, 250)
        doc.roundedRect(margin - 1, 14, logo.width + 4, logo.height + 4, 2, 2, 'F')
        doc.addImage(logo.dataUrl, 'PNG', margin + 1, 16, logo.width, logo.height)
      }

      const drawHeaderBand = () => {
        doc.setFillColor(41, 128, 185)
        doc.rect(0, 0, pageWidth, 56, 'F')
      }

      const ensureSpace = (neededSpace: number) => {
        if (yPos + neededSpace > pageHeight - 20) {
          doc.addPage()
          drawHeaderBand()
          yPos = 64
          drawHeaderLogo()
        }
      }

      const writeWrappedText = (text: string, x: number, width: number, lineHeight = 5) => {
        const lines = doc.splitTextToSize(text, width)
        lines.forEach((line: string) => {
          ensureSpace(lineHeight + 2)
          doc.text(line, x, yPos)
          yPos += lineHeight
        })
      }

      drawHeaderBand()
      drawHeaderLogo()

      const cityDate = `Bogota, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`
      const monthLabel = getReportMonthLabel(options.startDate, options.endDate)
      const headerClientName = options.isGeneralReport ? 'Todos los clientes' : options.clientName

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(255, 255, 255)
      doc.text('REPORTE DE KPIS', pageWidth / 2, logoHeight + 24, { align: 'center' })
      yPos += 8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth / 2, logoHeight + 30, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      yPos = 64

      ensureSpace(35)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(cityDate, margin, yPos)
      yPos += 7
      doc.text('Senores', margin, yPos)
      yPos += 6
      doc.text(headerClientName, margin, yPos)
      yPos += 7

      writeWrappedText(`Muy atentamente me dirijo a ustedes con el fin de detallar los servicios prestados durante ${monthLabel} a su empresa junto con las metricas de los ANS:`, margin, maxWidth)
      yPos += 4

      ensureSpace(60)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.setFontSize(12)
      doc.text('Metricas principales', margin, yPos)
      yPos += 6
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Total tickets: ${report.total}`, margin, yPos)
      yPos += 5
      doc.text(`Abiertos: ${report.mainMetrics.open}`, margin, yPos)
      yPos += 5
      doc.text(`Pendiente confirmacion: ${report.mainMetrics.pendingConfirmation}`, margin, yPos)
      yPos += 5
      doc.text(`Solucionados: ${report.mainMetrics.solved}`, margin, yPos)
      yPos += 8

      doc.setFont('helvetica', 'bold')
      doc.text('Distribucion por prioridad', margin, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.text(`P1 (Critico): ${report.priorityDistribution.P1}`, margin, yPos)
      yPos += 5
      doc.text(`P2 (Alto): ${report.priorityDistribution.P2}`, margin, yPos)
      yPos += 5
      doc.text(`P3 (Medio): ${report.priorityDistribution.P3}`, margin, yPos)
      yPos += 5
      doc.text(`P4 (Bajo): ${report.priorityDistribution.P4}`, margin, yPos)
      yPos += 8

      doc.setFont('helvetica', 'bold')
      doc.text('Distribucion por categoria', margin, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.text(`Hardware: ${report.categoryDistribution.Hardware}`, margin, yPos)
      yPos += 5
      doc.text(`Software: ${report.categoryDistribution.Software}`, margin, yPos)
      yPos += 5
      doc.text(`Red: ${report.categoryDistribution.Red}`, margin, yPos)
      yPos += 5
      doc.text(`Accesos: ${report.categoryDistribution.Accesos}`, margin, yPos)
      yPos += 5
      doc.text(`Otro: ${report.categoryDistribution.Otro}`, margin, yPos)
      yPos += 8

      ensureSpace(40)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('Tabla de KPIs', margin, yPos)
      yPos += 4

      autoTable(doc, {
        startY: yPos,
        head: [['FECHA', 'ACTIVIDAD', 'T.RTA', 'T.RES', 'Criticidad', 'Cumple', 'PERSONA QUE RECIBE']],
        body: report.rows.map((row) => [
          row.fecha,
          row.actividad,
          row.tiempoRespuesta,
          row.tiempoSolucion,
          row.criticidad,
          row.cumple,
          row.personaQueRecibe,
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 8,
          overflow: 'linebreak',
          cellPadding: 2,
        },
        styles: {
          overflow: 'linebreak',
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 54 },
          2: { cellWidth: 18 },
          3: { cellWidth: 18 },
          4: { cellWidth: 24 },
          5: { cellWidth: 16 },
          6: { cellWidth: 35 },
        },
        margin: { left: margin, right: margin },
      })

      yPos = (doc as any).lastAutoTable?.finalY || yPos + 20
      yPos += 8
      ensureSpace(85)

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      writeWrappedText('Con base en la informacion contenida anteriormente y respondiendo a las metricas de exito propuestas en los SLAs, a continuacion, presentamos el comportamiento de la operacion durante el mes:', margin, maxWidth)
      yPos += 4

      writeWrappedText('- Disponibilidad de servicios: No se registraron eventos nivel Critico P1; lo cual se traduce en que no hubo interrupciones del servicio, continuando con la disponibilidad del servicio en un nivel superior al 97.5% propuesto para los periodos operativos.', margin, maxWidth)
      yPos += 2

      const resolutionLine = `- Cumplimiento en Tiempos de resolucion: ${report.resolutionCompliance.percentage}% (${report.resolutionCompliance.within}/${report.resolutionCompliance.evaluated}) de los casos se resolvieron dentro de los tiempos propuestos en los SLA, dentro de los cuales se dividieron en:`
      writeWrappedText(resolutionLine, margin, maxWidth)
      yPos += 2

      report.priorityBuckets.forEach((bucket) => {
        const detail = `  - Criticidad ${bucket.code}: ${bucket.resolutionWithin}/${bucket.resolutionEvaluated} dentro de ${bucket.resolutionTargetLabel}.`
        writeWrappedText(detail, margin + 4, maxWidth - 4)
      })
      yPos += 2

      const responseLine = `- Cumplimiento en Tiempos de respuesta: ${report.responseCompliance.percentage}% (${report.responseCompliance.within}/${report.responseCompliance.evaluated}) dentro del tiempo objetivo por nivel (promedio general de respuesta: ${formatMinutesToReadable(report.responseCompliance.averageMinutes)}).`
      writeWrappedText(responseLine, margin, maxWidth)
      yPos += 2

      writeWrappedText('- Seguridad: No se presento ningun incidente de seguridad mayor que afectara la operacion, se implementaron nuevas politicas con mayor restriccion sobre la navegacion en redes sociales y el bloqueo del uso de dispositivos de almacenamiento externo por USB.', margin, maxWidth)
      yPos += 2

      writeWrappedText('- Productividad: Durante el mes de marzo se aprovisionaron 2 equipos nuevos, 2 docking station y 2 cargadores adicionales (para la direccion ejecutiva), ademas se han programado revisiones sobre equipos, infraestructura general y copias de seguridad en el servidor de aplicaciones, asi como ajustes en las politicas de dominio, para un total de 10 atenciones en sitio. Como ultimo anexo, se programaron 4 visitas al domicilio del director ejecutivo para la instalacion de 2 Access Point como solucion de red y la entrega de un equipo para uso personal junto con su respectivo docking.', margin, maxWidth)
      yPos += 8

      ensureSpace(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Rodrigo Andres Quintero G.', margin, yPos)
      yPos += 5
      doc.setFont('helvetica', 'normal')
      doc.text('Director General - Silverlight Colombia', margin, yPos)

      const totalPages = (doc.internal as any).getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        drawHeaderBand()
        drawHeaderLogo()
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(`Pagina ${page} de ${totalPages}`, 105, pageHeight - 10, { align: 'center' })
      }

      const periodSegment = options.reportPeriodSlug ? `-${options.reportPeriodSlug}` : ''
      const fileName = options.isGeneralReport
        ? `reporte-general-kpis${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
        : `reporte-kpis-${options.clientName.replace(/\s+/g, '-').toLowerCase()}${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.pdf`

      doc.save(fileName)
    } catch (error) {
      console.error('Error generando reporte KPI PDF:', error)
      throw error
    }
  }
}
