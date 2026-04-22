import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export interface VisitReportRow {
  id: string
  fecha: string
  cliente: string
  tipo: string
  estado: string
  tecnico: string
  equipos: string
  detalle: string
  recomendaciones: string
}

export class VisitReportPDF {
  static async generateReport(
    rows: VisitReportRow[],
    title: string,
    reportPeriodSlug?: string,
    reportPeriodLabel?: string
  ): Promise<void> {
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.default
    const { autoTable } = await import('jspdf-autotable')

    const doc: any = new jsPDF('landscape', 'mm', 'a4')
    const margin = 12
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFillColor(41, 128, 185)
    doc.rect(0, 0, pageWidth, 30, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('REPORTE DE VISITAS', pageWidth / 2, 12, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const subtitle = reportPeriodLabel ? `${title} - ${reportPeriodLabel}` : title
    doc.text(subtitle, pageWidth / 2, 20, { align: 'center' })
    doc.text(`Generado: ${format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}`, pageWidth / 2, 26, { align: 'center' })

    const body = rows.map((row) => [
      row.fecha,
      row.cliente,
      row.tipo,
      row.estado,
      row.tecnico,
      row.equipos,
      row.detalle,
      row.recomendaciones,
    ])

    autoTable(doc, {
      startY: 38,
      head: [[
        'Fecha',
        'Cliente',
        'Tipo',
        'Estado',
        'Técnico',
        'Equipos',
        'Detalle',
        'Recomendaciones',
      ]],
      body,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 30 },
        5: { cellWidth: 45 },
        6: { cellWidth: 45 },
        7: { cellWidth: 45 },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    })

    const totalPages = (doc.internal as any).getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(110, 110, 110)
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 8, {
        align: 'right',
      })
    }

    const periodSegment = reportPeriodSlug ? `-${reportPeriodSlug}` : ''
    const filename = `reporte-visitas${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    doc.save(filename)
  }
}
