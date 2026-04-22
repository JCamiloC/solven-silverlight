import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ClientVisit } from '@/types'

export class VisitDetailPDF {
  static async generateVisitPDF(visit: ClientVisit, clientName: string): Promise<void> {
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.default
    const { autoTable } = await import('jspdf-autotable')

    const doc: any = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pageWidth - margin * 2
    let yPos = 20

    const checkNewPage = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - 18) {
        doc.addPage()
        yPos = 20
      }
    }

    const addWrappedText = (text: string, fontSize = 10) => {
      doc.setFontSize(fontSize)
      const lines = doc.splitTextToSize(text || '-', contentWidth)
      lines.forEach((line: string) => {
        checkNewPage(7)
        doc.text(line, margin, yPos)
        yPos += 6
      })
    }

    const getTypeLabel = (value: string) => {
      const map: Record<string, string> = {
        programada: 'Programada',
        no_programada: 'No programada',
        diagnostico: 'Diagnostico',
        mantenimiento: 'Mantenimiento',
        soporte: 'Soporte en sitio',
        otro: 'Otro',
      }
      return map[value] || value
    }

    const getStatusLabel = (value: string) => {
      const map: Record<string, string> = {
        completada: 'Completada',
        pendiente: 'Pendiente',
        cancelada: 'Cancelada',
      }
      return map[value] || value
    }

    const tecnico = visit.tecnico
      ? `${visit.tecnico.first_name || ''} ${visit.tecnico.last_name || ''}`.trim() || '-'
      : '-'

    doc.setFillColor(41, 128, 185)
    doc.rect(0, 0, pageWidth, 35, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text('DETALLE DE VISITA TECNICA', pageWidth / 2, 13, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(clientName, pageWidth / 2, 21, { align: 'center' })
    doc.text(`Generado: ${format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}`, pageWidth / 2, 28, {
      align: 'center',
    })

    doc.setTextColor(0, 0, 0)
    yPos = 45

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('Resumen de la visita', margin, yPos)
    yPos += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Fecha: ${format(new Date(visit.fecha_visita), 'dd/MM/yyyy HH:mm', { locale: es })}`, margin, yPos)
    yPos += 6
    doc.text(`Tipo: ${getTypeLabel(visit.tipo)}`, margin, yPos)
    yPos += 6
    doc.text(`Estado: ${getStatusLabel(visit.estado)}`, margin, yPos)
    yPos += 6
    doc.text(`Tecnico responsable: ${tecnico}`, margin, yPos)
    yPos += 10

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Detalle general', margin, yPos)
    yPos += 7
    doc.setFont('helvetica', 'normal')
    addWrappedText(visit.detalle || '-')
    yPos += 4

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Actividades', margin, yPos)
    yPos += 7
    doc.setFont('helvetica', 'normal')
    addWrappedText(visit.actividades.length ? visit.actividades.join(' | ') : 'Sin actividades registradas.')
    yPos += 4

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Recomendaciones', margin, yPos)
    yPos += 7
    doc.setFont('helvetica', 'normal')
    addWrappedText(visit.recomendaciones || 'Sin recomendaciones registradas.')
    yPos += 6

    checkNewPage(30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Equipos atendidos', margin, yPos)

    const tableRows = visit.equipos.length
      ? visit.equipos.map((equipment) => [
          equipment.hardware?.name || equipment.hardware_nombre_manual || 'Sin especificar',
          equipment.hardware?.serial_number || '-',
          equipment.tareas_realizadas || '-',
        ])
      : [['Sin equipos registrados', '-', '-']]

    autoTable(doc, {
      startY: yPos + 4,
      head: [['Equipo', 'Serial', 'Tareas realizadas']],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    })

    const totalPages = (doc.internal as any).getNumberOfPages()
    for (let i = 1; i <= totalPages; i += 1) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(110, 110, 110)
      doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
    }

    const safeClient = clientName.replace(/\s+/g, '_').toLowerCase()
    const filename = `visita-detalle-${safeClient}-${format(new Date(visit.fecha_visita), 'yyyy-MM-dd-HHmm')}.pdf`
    doc.save(filename)
  }
}
