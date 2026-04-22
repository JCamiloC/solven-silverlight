/**
 * Servicio para generar PDF de Hoja de Vida de Hardware
 * Genera un documento PDF con información completa del activo tecnológico:
 * - Información General
 * - Especificaciones Técnicas (con historial de upgrades)
 * - Historial de Mantenimientos
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { HardwareAsset, HardwareUpgrade } from '@/types'
import { getSoftwareDisplayName } from '@/lib/utils'

interface FollowUp {
  id: string
  tipo: string
  detalle: string
  actividades: string[]
  fecha_registro: string
  creator?: {
    first_name: string
    last_name: string
  }
}

interface AssociatedTicket {
  id: string
  ticket_number?: string
  title: string
  status: string
  priority: string
  category: string
  created_at: string
}

export class HardwareLifesheetPDF {
  /**
   * Genera la hoja de vida completa del hardware en PDF
   */
  static async generateLifesheet(
    hardware: HardwareAsset,
    upgrades: HardwareUpgrade[],
    followUps: FollowUp[],
    tickets: AssociatedTicket[] = []
  ): Promise<void> {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()

      let yPos = 20
      const pageHeight = doc.internal.pageSize.height
      const margin = 20
      const maxWidth = 170

      // Función helper para agregar nueva página si es necesario
      const checkNewPage = (neededSpace: number) => {
        if (yPos + neededSpace > pageHeight - 30) {
          doc.addPage()
          yPos = 20
          return true
        }
        return false
      }

      const runAutoTable = (options: any) => {
        autoTable(doc as any, options)
        if (!(doc as any).lastAutoTable) {
          ;(doc as any).lastAutoTable = { finalY: options.startY || yPos }
        }
      }

      // ==========================================
      // ENCABEZADO PRINCIPAL
      // ==========================================
      doc.setFillColor(41, 128, 185) // Azul corporativo
      doc.rect(0, 0, 210, 35, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('HOJA DE VIDA DEL ACTIVO TECNOLÓGICO', 105, 15, { align: 'center' })
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(hardware.name || 'Sin nombre', 105, 25, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      yPos = 45

      // ==========================================
      // SECCIÓN 1: INFORMACIÓN GENERAL
      // ==========================================
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('INFORMACIÓN GENERAL', margin, yPos)
      yPos += 10

      // Línea divisoria
      doc.setDrawColor(41, 128, 185)
      doc.setLineWidth(0.5)
      doc.line(margin, yPos, 190, yPos)
      yPos += 8

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')

      const generalInfo = [
        { label: 'Nombre del Activo tecnológico', value: hardware.name || 'N/A' },
        { label: 'Tipo', value: hardware.type || 'N/A' },
        { label: 'Estado', value: this.translateStatus(hardware.status) },
        { label: 'Ubicación', value: hardware.location || 'No especificada' },
        { label: 'Sede', value: hardware.sede || 'No especificada' },
        { label: 'Persona Responsable', value: hardware.persona_responsable || 'No asignado' },
        { label: 'Fecha de Adquisición', value: hardware.purchase_date ? format(new Date(hardware.purchase_date), "dd 'de' MMMM yyyy", { locale: es }) : 'N/A' },
        { label: 'Fecha de Registro', value: format(new Date(hardware.created_at), "dd 'de' MMMM yyyy", { locale: es }) },
      ]

      generalInfo.forEach(item => {
        checkNewPage(15)
        doc.setFont('helvetica', 'bold')
        doc.text(`${item.label}:`, margin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(item.value, margin + 60, yPos)
        yPos += 7
      })

      yPos += 5

      // ==========================================
      // SECCIÓN 2: ESPECIFICACIONES TÉCNICAS
      // ==========================================
      checkNewPage(40)
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('ESPECIFICACIONES TÉCNICAS', margin, yPos)
      yPos += 10

      doc.setDrawColor(41, 128, 185)
      doc.setLineWidth(0.5)
      doc.line(margin, yPos, 190, yPos)
      yPos += 8

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')

      const technicalInfo = [
        { label: 'Procesador', value: hardware.procesador || 'No especificado', hasUpgrade: this.hasUpgrade(upgrades, 'procesador') },
        { label: 'Memoria RAM', value: hardware.memoria_ram || 'No especificada', hasUpgrade: this.hasUpgrade(upgrades, 'memoria_ram') },
        { label: 'Disco Duro', value: hardware.disco_duro || 'No especificado', hasUpgrade: this.hasUpgrade(upgrades, 'disco_duro') },
        { label: 'Sistema Operativo', value: getSoftwareDisplayName(hardware.sistema_operativo), hasUpgrade: false },
        { label: 'Modelo', value: hardware.model || 'No especificado', hasUpgrade: false },
        { label: 'Número de Serie', value: hardware.serial_number || 'No especificado', hasUpgrade: false },
      ]

      technicalInfo.forEach(item => {
        checkNewPage(15)
        doc.setFont('helvetica', 'bold')
        doc.text(`${item.label}:`, margin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(item.value, margin + 60, yPos)
        
        // Indicador de upgrade
        if (item.hasUpgrade) {
          doc.setTextColor(0, 128, 0)
          doc.setFontSize(9)
          doc.text('⬆ Actualizado', margin + 60, yPos + 4)
          doc.setTextColor(0, 0, 0)
          doc.setFontSize(11)
        }
        
        yPos += item.hasUpgrade ? 10 : 7
      })

      // Historial de Actualizaciones Físicas
      if (upgrades.length > 0) {
        yPos += 5
        checkNewPage(30)

        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('Historial de Actualizaciones', margin, yPos)
        yPos += 8

        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)

        upgrades.forEach((upgrade, index) => {
          checkNewPage(25)

          // Fondo gris claro para cada upgrade
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, yPos - 4, maxWidth, 20, 'F')

          doc.setFont('helvetica', 'bold')
          doc.text(`${index + 1}. ${format(new Date(upgrade.created_at), "dd/MM/yyyy", { locale: es })}`, margin + 2, yPos)
          yPos += 6

          doc.setFont('helvetica', 'normal')
          upgrade.changed_fields.forEach(field => {
            const oldValue = upgrade[`previous_${field}` as keyof HardwareUpgrade] as string || 'N/A'
            const newValue = upgrade[`new_${field}` as keyof HardwareUpgrade] as string || 'N/A'
            const fieldName = this.translateField(field)

            doc.setTextColor(100, 100, 100)
            doc.text(`${fieldName}:`, margin + 4, yPos)
            doc.setTextColor(200, 0, 0)
            doc.text(`${oldValue}`, margin + 40, yPos)
            doc.setTextColor(0, 128, 0)
            doc.text(`→ ${newValue}`, margin + 90, yPos)
            doc.setTextColor(0, 0, 0)
            yPos += 5
          })

          yPos += 2
        })

        yPos += 5
      }

      // ==========================================
      // SECCIÓN 3: HISTORIAL DE MANTENIMIENTOS
      // ==========================================
      checkNewPage(40)

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('HISTORIAL DE MANTENIMIENTOS', margin, yPos)
      yPos += 10

      doc.setDrawColor(41, 128, 185)
      doc.setLineWidth(0.5)
      doc.line(margin, yPos, 190, yPos)
      yPos += 8

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)

      if (followUps.length === 0) {
        doc.setFont('helvetica', 'italic')
        doc.text('No hay mantenimientos registrados para este activo tecnológico.', margin, yPos)
        yPos += 10
      } else {
        const maintenanceRows = followUps.map((followUp) => [
          format(new Date(followUp.fecha_registro), 'dd/MM/yyyy HH:mm', { locale: es }),
          this.translateTipo(followUp.tipo),
          followUp.creator
            ? `${followUp.creator.first_name || ''} ${followUp.creator.last_name || ''}`.trim()
            : 'Sin asignar',
          followUp.detalle || '-',
        ])

        runAutoTable({
          startY: yPos,
          head: [['Fecha', 'Tipo', 'Técnico asignado', 'Detalle']],
          body: maintenanceRows,
          theme: 'grid',
          headStyles: {
            fillColor: [41, 128, 185],
            fontSize: 9,
            fontStyle: 'bold',
          },
          styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak',
          },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 35 },
            2: { cellWidth: 40 },
            3: { cellWidth: 75 },
          },
          margin: { left: margin, right: margin },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        })

        yPos = (doc as any).lastAutoTable.finalY + 10
      }

      // ==========================================
      // SECCIÓN 4: TICKETS ASOCIADOS
      // ==========================================
      checkNewPage(40)

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('TICKETS ASOCIADOS', margin, yPos)
      yPos += 10

      doc.setDrawColor(41, 128, 185)
      doc.setLineWidth(0.5)
      doc.line(margin, yPos, 190, yPos)
      yPos += 8

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)

      if (tickets.length === 0) {
        doc.setFont('helvetica', 'italic')
        doc.text('No hay tickets asociados a este activo tecnológico.', margin, yPos)
        yPos += 10
      } else {
        tickets.forEach((ticket, index) => {
          checkNewPage(30)

          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250)
            doc.rect(margin, yPos - 4, maxWidth, 24, 'F')
          }

          doc.setFont('helvetica', 'bold')
          doc.text(
            `${index + 1}. Ticket ${ticket.ticket_number || ticket.id.slice(0, 8)}`,
            margin + 2,
            yPos
          )

          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text(
            `${this.translateTicketStatus(ticket.status)} · ${this.translatePriority(ticket.priority)} · ${this.translateCategory(ticket.category)} · ${format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: es })}`,
            margin + 2,
            yPos + 5
          )
          doc.setTextColor(0, 0, 0)
          yPos += 10

          const ticketTitleLines = doc.splitTextToSize(ticket.title || 'Sin título', maxWidth - 10)
          ticketTitleLines.forEach((line: string) => {
            checkNewPage(6)
            doc.text(line, margin + 4, yPos)
            yPos += 5
          })

          yPos += 5
        })
      }

      // ==========================================
      // FOOTER: SILVERLIGHT COLOMBIA
      // ==========================================
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        
        // Línea superior del footer
        doc.setDrawColor(41, 128, 185)
        doc.setLineWidth(0.5)
        doc.line(20, pageHeight - 20, 190, pageHeight - 20)

        // Texto del footer
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('SILVERLIGHT COLOMBIA', 105, pageHeight - 12, { align: 'center' })
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text('Sistema de Gestión de Activos Tecnológicos', 105, pageHeight - 8, { align: 'center' })
        
        // Número de página
        doc.text(`Página ${i} de ${totalPages}`, 190, pageHeight - 8, { align: 'right' })
      }

      // Descargar PDF
      const filename = `HojaVida_${hardware.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`
      doc.save(filename)
    } catch (error) {
      console.error('Error generating hardware lifesheet PDF:', error)
      throw new Error('Failed to generate hardware lifesheet PDF')
    }
  }

  /**
   * Helper: Verifica si hay upgrades para un campo específico
   */
  private static hasUpgrade(upgrades: HardwareUpgrade[], field: string): boolean {
    return upgrades.some(upgrade => upgrade.changed_fields.includes(field))
  }

  /**
   * Helper: Traduce el campo técnico a español
   */
  private static translateField(field: string): string {
    const translations: Record<string, string> = {
      'procesador': 'Procesador',
      'memoria_ram': 'Memoria RAM',
      'disco_duro': 'Disco Duro',
    }
    return translations[field] || field
  }

  /**
   * Helper: Traduce el tipo de seguimiento
   */
  private static translateTipo(tipo: string): string {
    const translations: Record<string, string> = {
      'mantenimiento_programado': 'Mantenimiento Programado',
      'mantenimiento_no_programado': 'Mantenimiento No Programado',
      'soporte_remoto': 'Soporte Remoto',
      'soporte_en_sitio': 'Soporte en Sitio',
    }
    return translations[tipo] || tipo
  }

  /**
   * Helper: Traduce el estado del hardware
   */
  private static translateStatus(status: string): string {
    const translations: Record<string, string> = {
      'active': 'Activo',
      'maintenance': 'En Mantenimiento',
      'retired': 'Retirado',
      'inactive': 'Inactivo',
    }
    return translations[status] || status
  }

  private static translateTicketStatus(status: string): string {
    const translations: Record<string, string> = {
      'open': 'Abierto',
      'pendiente_confirmacion': 'Pendiente de Confirmación',
      'solucionado': 'Solucionado',
      'in_progress': 'En Progreso',
      'resolved': 'Resuelto',
      'closed': 'Cerrado',
    }
    return translations[status] || status
  }

  private static translatePriority(priority: string): string {
    const translations: Record<string, string> = {
      'critical': 'Crítica',
      'high': 'Alta',
      'medium': 'Media',
      'low': 'Baja',
    }
    return translations[priority] || priority
  }

  private static translateCategory(category: string): string {
    const translations: Record<string, string> = {
      'hardware': 'Hardware',
      'software': 'Software',
      'network': 'Red',
      'access': 'Accesos',
      'other': 'Otro',
    }
    return translations[category] || category
  }

}
