/**
 * Servicio para generar PDF de Hoja de Vida de Hardware
 * Genera un documento PDF con información completa del equipo:
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

export class HardwareLifesheetPDF {
  /**
   * Genera la hoja de vida completa del hardware en PDF
   */
  static async generateLifesheet(
    hardware: HardwareAsset,
    upgrades: HardwareUpgrade[],
    followUps: FollowUp[]
  ): Promise<void> {
    try {
      const { default: jsPDF } = await import('jspdf')
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

      // ==========================================
      // ENCABEZADO PRINCIPAL
      // ==========================================
      doc.setFillColor(41, 128, 185) // Azul corporativo
      doc.rect(0, 0, 210, 35, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('HOJA DE VIDA DEL EQUIPO', 105, 15, { align: 'center' })
      
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
        { label: 'Nombre del Equipo', value: hardware.name || 'N/A' },
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
        doc.text('No hay mantenimientos registrados para este equipo.', margin, yPos)
        yPos += 10
      } else {
        followUps.forEach((followUp, index) => {
          checkNewPage(35)

          // Fondo alternado
          if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250)
            doc.rect(margin, yPos - 4, maxWidth, 30, 'F')
          }

          doc.setFont('helvetica', 'bold')
          doc.text(`${index + 1}. ${this.translateTipo(followUp.tipo)}`, margin + 2, yPos)
          
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text(
            format(new Date(followUp.fecha_registro), "dd/MM/yyyy HH:mm", { locale: es }),
            margin + 2,
            yPos + 5
          )
          doc.setTextColor(0, 0, 0)
          yPos += 10

          // Detalle
          const detailLines = doc.splitTextToSize(followUp.detalle, maxWidth - 10)
          detailLines.forEach((line: string) => {
            checkNewPage(8)
            doc.text(line, margin + 4, yPos)
            yPos += 5
          })

          // Actividades
          if (followUp.actividades && followUp.actividades.length > 0) {
            yPos += 2
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            doc.text('Actividades:', margin + 4, yPos)
            yPos += 4
            followUp.actividades.forEach(actividad => {
              checkNewPage(6)
              doc.text(`• ${actividad}`, margin + 8, yPos)
              yPos += 4
            })
            doc.setFontSize(10)
            doc.setTextColor(0, 0, 0)
          }

          // Técnico
          if (followUp.creator) {
            doc.setFontSize(8)
            doc.setTextColor(150, 150, 150)
            doc.text(
              `Técnico: ${followUp.creator.first_name} ${followUp.creator.last_name}`,
              margin + 4,
              yPos
            )
            doc.setFontSize(10)
            doc.setTextColor(0, 0, 0)
          }

          yPos += 8
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

}
