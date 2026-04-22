/**
 * Servicio para generar PDF de un Ticket Individual
 * Incluye toda la información del ticket y comentarios (excluyendo internos)
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TicketWithRelations } from '@/lib/services/tickets'
import type { TicketCommentWithUser } from '@/lib/services/ticket-comments'

export class TicketDetailPDF {
  /**
   * Genera el PDF de un ticket individual
   */
  static async generateTicketPDF(
    ticket: TicketWithRelations,
    comments: TicketCommentWithUser[],
    clientName: string
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

      // Función helper para verificar espacio y agregar nueva página si es necesario
      const checkNewPage = (neededSpace: number) => {
        if (yPos + neededSpace > pageHeight - 20) {
          doc.addPage()
          yPos = 20
          return true
        }
        return false
      }

      // Función para texto multilínea
      const addMultilineText = (text: string, maxWidth: number, fontSize: number = 10) => {
        doc.setFontSize(fontSize)
        const lines = doc.splitTextToSize(text, maxWidth)
        lines.forEach((line: string) => {
          checkNewPage(7)
          doc.text(line, margin, yPos)
          yPos += 6
        })
      }

      // ==========================================
      // ENCABEZADO PRINCIPAL
      // ==========================================
      doc.setFillColor(41, 128, 185)
      doc.rect(0, 0, 210, 50, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('DETALLE DE TICKET', 105, 18, { align: 'center' })
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'normal')
      doc.text(ticket.ticket_number || `#${ticket.id.slice(-8)}`, 105, 30, { align: 'center' })

      doc.setFontSize(12)
      doc.text(clientName, 105, 38, { align: 'center' })

      doc.setFontSize(9)
      doc.text(`Generado: ${format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}`, 105, 45, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      yPos = 60

      // ==========================================
      // INFORMACIÓN DEL TICKET
      // ==========================================
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('INFORMACIÓN DEL TICKET', margin, yPos)
      yPos += 8

      // Título
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Asunto:', margin, yPos)
      doc.setFont('helvetica', 'normal')
      addMultilineText(ticket.title, maxWidth - 20, 11)
      yPos += 3

      // Descripción
      checkNewPage(15)
      doc.setFont('helvetica', 'bold')
      doc.text('Descripción:', margin, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      addMultilineText(ticket.description, maxWidth, 10)
      yPos += 3

      // Información en dos columnas
      checkNewPage(60)
      const col1X = margin
      const col2X = 110
      const labelWidth = 35
      const lineHeight = 7
      const col2ValueWidth = 48

      const writeCol2Field = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold')
        doc.text(label, col2X, currentY)
        doc.setFont('helvetica', 'normal')

        const lines = doc.splitTextToSize(value || 'N/A', col2ValueWidth)
        lines.forEach((line: string, index: number) => {
          doc.text(line, col2X + labelWidth, currentY + index * 5)
        })

        currentY += Math.max(lineHeight, lines.length * 5 + 1)
      }

      // Columna 1
      let currentY = yPos

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Fecha de Creación:', col1X, currentY)
      doc.setFont('helvetica', 'normal')
      doc.text(format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: es }), col1X + labelWidth, currentY)
      currentY += lineHeight

      doc.setFont('helvetica', 'bold')
      doc.text('Estado:', col1X, currentY)
      doc.setFont('helvetica', 'normal')
      doc.text(this.getStatusLabel(ticket.status), col1X + labelWidth, currentY)
      currentY += lineHeight

      doc.setFont('helvetica', 'bold')
      doc.text('Prioridad:', col1X, currentY)
      doc.setFont('helvetica', 'normal')
      doc.text(this.getPriorityLabel(ticket.priority), col1X + labelWidth, currentY)
      currentY += lineHeight

      doc.setFont('helvetica', 'bold')
      doc.text('Categoría:', col1X, currentY)
      doc.setFont('helvetica', 'normal')
      doc.text(this.getCategoryLabel(ticket.category), col1X + labelWidth, currentY)
      currentY += lineHeight

      // Columna 2
      currentY = yPos

      const usuarioAfectado = ticket.usuario_afectado || 'N/A'
      writeCol2Field('Usuario Afectado:', usuarioAfectado)

      const contactEmail = ticket.contact_email || 'N/A'
      writeCol2Field('Email de Contacto:', contactEmail)

      if (ticket.assigned_user) {
        const assignedName = `${ticket.assigned_user.first_name} ${ticket.assigned_user.last_name}`
        writeCol2Field('Asignado a:', assignedName)
      }

      if (ticket.resolved_at) {
        doc.setFont('helvetica', 'bold')
        doc.text('Fecha de Resolución:', col2X, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(format(new Date(ticket.resolved_at), "dd/MM/yyyy HH:mm", { locale: es }), col2X + labelWidth, currentY)
        currentY += lineHeight
      }

      yPos = Math.max(currentY, yPos + (4 * lineHeight)) + 10

      // ==========================================
      // COMENTARIOS (SOLO NO INTERNOS)
      // ==========================================
      const publicComments = comments.filter(c => !c.is_internal)

      if (publicComments.length > 0) {
        checkNewPage(30)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('HISTORIAL DE COMENTARIOS', margin, yPos)
        yPos += 10

        publicComments.forEach((comment, index) => {
          checkNewPage(25)

          // Separador
          if (index > 0) {
            doc.setDrawColor(200, 200, 200)
            doc.line(margin, yPos, 210 - margin, yPos)
            yPos += 5
          }

          // Información del comentario
          doc.setFontSize(9)
          doc.setTextColor(100, 100, 100)
          doc.setFont('helvetica', 'normal')
          const commentDate = format(new Date(comment.created_at), "dd/MM/yyyy HH:mm", { locale: es })
          const commenterName = `${comment.user.first_name} ${comment.user.last_name}`
          doc.text(`${commenterName} - ${commentDate}`, margin, yPos)
          yPos += 6

          // Contenido del comentario
          doc.setFontSize(10)
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'normal')
          
          // Agregar recuadro alrededor del comentario
          const commentLines = doc.splitTextToSize(comment.comment, maxWidth - 10)
          const commentHeight = commentLines.length * 5 + 4
          
          checkNewPage(commentHeight + 5)
          
          doc.setFillColor(250, 250, 250)
          doc.setDrawColor(220, 220, 220)
          doc.roundedRect(margin, yPos - 2, maxWidth, commentHeight, 2, 2, 'FD')
          
          let commentY = yPos + 2
          commentLines.forEach((line: string) => {
            doc.text(line, margin + 3, commentY)
            commentY += 5
          })
          
          yPos = commentY + 3
        })
      } else {
        checkNewPage(20)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('HISTORIAL DE COMENTARIOS', margin, yPos)
        yPos += 10

        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.setFont('helvetica', 'italic')
        doc.text('No hay comentarios registrados para este ticket', margin, yPos)
      }

      // ==========================================
      // PIE DE PÁGINA
      // ==========================================
      const totalPages = (doc.internal as any).getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.setFont('helvetica', 'normal')
        
        // Línea separadora
        doc.setDrawColor(200, 200, 200)
        doc.line(margin, pageHeight - 15, 210 - margin, pageHeight - 15)
        
        // Texto del pie
        doc.text(
          `Ticket ${ticket.ticket_number || `#${ticket.id.slice(-8)}`}`,
          margin,
          pageHeight - 10
        )
        doc.text(
          `Página ${i} de ${totalPages}`,
          210 - margin,
          pageHeight - 10,
          { align: 'right' }
        )
      }

      // Guardar PDF
      const fileName = `ticket-${ticket.ticket_number || ticket.id.slice(-8)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Error generando PDF del ticket:', error)
      throw error
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
