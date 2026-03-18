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
import type { VisitReportRow } from '@/lib/services/visit-report-pdf'

export class VisitReportWord {
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
      children: [new Paragraph({ text: text || '-' })],
    })
  }

  static async generateReport(
    rows: VisitReportRow[],
    title: string,
    reportPeriodSlug?: string,
    reportPeriodLabel?: string
  ): Promise<void> {
    const subtitle = reportPeriodLabel ? `${title} - ${reportPeriodLabel}` : title

    const tableRows = [
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
      ...rows.map((row) =>
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

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'REPORTE DE VISITAS',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: subtitle,
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: `Generado: ${format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}`,
              alignment: AlignmentType.CENTER,
              spacing: { after: 250 },
            }),
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
    const filename = `reporte-visitas${periodSegment}-${format(new Date(), 'yyyy-MM-dd')}.docx`
    saveAs(blob, filename)
  }
}
