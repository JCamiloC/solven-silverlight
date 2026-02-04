/**
 * Servicio para generar PDF de Acta de Entrega de Hardware
 * Genera un documento formal para registrar la entrega de equipos
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { HardwareAsset } from '@/types'

interface ActaDeliveryData {
  hardware: HardwareAsset
  entregadoPor: {
    nombre: string
    cargo: string
    cedula?: string
  }
  recibidoPor?: {
    nombre?: string
    cedula?: string
  }
  currentUserName?: string
  generadorFirmaUrl?: string | null
  clienteFirmaUrl?: string | null
}

export class HardwareDeliveryActaPDF {
  /**
   * Genera el acta de entrega del hardware en PDF
   */
  static async generateActa(data: ActaDeliveryData): Promise<void> {
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      const { hardware, entregadoPor, currentUserName } = data
      
      let yPos = 20
      const pageHeight = doc.internal.pageSize.height
      const pageWidth = doc.internal.pageSize.width
      const margin = 20
      const maxWidth = pageWidth - 2 * margin

      // ==========================================
      // ENCABEZADO
      // ==========================================
      doc.setFillColor(41, 128, 185)
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('ACTA DE ENTREGA DE EQUIPO', pageWidth / 2, 15, { align: 'center' })
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('SILVERLIGHT COLOMBIA', pageWidth / 2, 25, { align: 'center' })
      doc.text('Sistema de Gestión de Activos Tecnológicos', pageWidth / 2, 32, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      yPos = 50

      // ==========================================
      // FECHA DE ENTREGA
      // ==========================================
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      const fechaEntrega = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })
      doc.text(`Fecha de Entrega: ${fechaEntrega}`, margin, yPos)
      yPos += 15

      // Línea divisoria
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 10

      // ==========================================
      // INFORMACIÓN DE ENTREGA Y RECEPCIÓN
      // ==========================================
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('DATOS DE ENTREGA Y RECEPCIÓN', margin, yPos)
      yPos += 8

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')

      // Quien Entrega
      doc.setFont('helvetica', 'bold')
      doc.text('ENTREGADO POR:', margin, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.text(`Nombre: ${entregadoPor.nombre || currentUserName || 'N/A'}`, margin + 5, yPos)
      yPos += 6
      doc.text(`Cargo: ${entregadoPor.cargo || 'Técnico de Soporte'}`, margin + 5, yPos)
      yPos += 6
      if (entregadoPor.cedula) {
        doc.text(`Cédula: ${entregadoPor.cedula}`, margin + 5, yPos)
        yPos += 10
      } else {
        yPos += 4
      }

      // Quien Recibe
      doc.setFont('helvetica', 'bold')
      doc.text('RECIBIDO POR:', margin, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      const recibidoNombre = (data as any).recibidoPor?.nombre || hardware.persona_responsable || 'No especificado'
      const recibidoCedula = (data as any).recibidoPor?.cedula || null
      doc.text(`Nombre: ${recibidoNombre}`, margin + 5, yPos)
      yPos += 6
      if (recibidoCedula) {
        doc.text(`Cédula: ${recibidoCedula}`, margin + 5, yPos)
        yPos += 6
      }
      doc.text(`Área: ${hardware.area_encargada || 'No especificada'}`, margin + 5, yPos)
      yPos += 6
      doc.text(`Sede: ${hardware.sede || 'No especificada'}`, margin + 5, yPos)
      yPos += 6

      // Línea divisoria
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 10

      // ==========================================
      // DESCRIPCIÓN DEL EQUIPO ENTREGADO
      // ==========================================
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('DESCRIPCIÓN DEL EQUIPO ENTREGADO', margin, yPos)
      yPos += 8

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      // Detalles del Hardware en formato tabla
      const hardwareDetails = [
        ['Nombre del Equipo:', hardware.name || 'N/A'],
        ['Tipo:', hardware.type || 'N/A'],
        ['Marca:', hardware.brand || 'N/A'],
        ['Modelo:', hardware.model || 'N/A'],
        ['Número de Serie:', hardware.serial_number || 'N/A'],
        ['Procesador:', hardware.procesador || 'No especificado'],
        ['Memoria RAM:', hardware.memoria_ram || 'No especificada'],
        ['Disco Duro:', hardware.disco_duro || 'No especificado'],
        ['Sistema Operativo:', this.formatSoftwareField(hardware.sistema_operativo)],
        ['Estado:', this.translateStatus(hardware.status)],
        ['Ubicación:', hardware.sede || hardware.location || 'No especificada'],
      ]

      // Dibujar recuadro para detalles
      const tableStartY = yPos
      const rowHeight = 6
      const col1Width = 60
      const col2Width = maxWidth - col1Width

      hardwareDetails.forEach(([label, value], index) => {
        // Fondo alternado
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, yPos - 4, maxWidth, rowHeight, 'F')
        }

        doc.setFont('helvetica', 'bold')
        doc.text(label, margin + 2, yPos)
        doc.setFont('helvetica', 'normal')
        
        // Truncar texto si es muy largo
        const valueText = value.length > 50 ? value.substring(0, 50) + '...' : value
        doc.text(valueText, margin + col1Width, yPos)
        
        yPos += rowHeight
      })

      // Borde del recuadro
      doc.setDrawColor(100, 100, 100)
      doc.setLineWidth(0.5)
      doc.rect(margin, tableStartY - 4, maxWidth, rowHeight * hardwareDetails.length)

      yPos += 5

      // Periféricos (si aplica)
      const perifericos = []
      if (hardware.mouse) perifericos.push(`Mouse (S/N: ${hardware.mouse_serial || 'N/A'})`)
      if (hardware.teclado) perifericos.push(`Teclado (S/N: ${hardware.teclado_serial || 'N/A'})`)
      if (hardware.diadema) perifericos.push(`Diadema (S/N: ${hardware.diadema_serial || 'N/A'})`)
      if (hardware.otro_periferico) perifericos.push(hardware.otro_periferico)

      if (perifericos.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.text('Periféricos incluidos:', margin, yPos)
        yPos += 6
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        perifericos.forEach(periferico => {
          doc.text(`• ${periferico}`, margin + 5, yPos)
          yPos += 5
        })
        doc.setFontSize(10)
        yPos += 5
      }

      // ==========================================
      // SOFTWARE INSTALADO
      // ==========================================
      yPos += 5
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('SOFTWARE INSTALADO', margin, yPos)
      yPos += 8

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      const softwareList = []
      if (hardware.ms_office) {
        softwareList.push(`Microsoft Office: ${this.formatSoftwareField(hardware.ms_office)}`)
      }
      if (hardware.antivirus) {
        softwareList.push(`Antivirus: ${this.formatSoftwareField(hardware.antivirus)}`)
      }
      if (hardware.software_extra && hardware.software_extra.length > 0) {
        hardware.software_extra.forEach(sw => {
          if (typeof sw === 'string') {
            softwareList.push(sw)
          } else if (sw && typeof sw === 'object') {
            softwareList.push(JSON.stringify(sw))
          }
        })
      }

      if (softwareList.length > 0) {
        softwareList.forEach(software => {
          const lines = doc.splitTextToSize(`• ${software}`, maxWidth - 10)
          lines.forEach((line: string) => {
            doc.text(line, margin + 5, yPos)
            yPos += 5
          })
        })
      } else {
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150, 150, 150)
        doc.text('No se especificó software instalado', margin + 5, yPos)
        doc.setTextColor(0, 0, 0)
        yPos += 6
      }

      yPos += 10

      // ==========================================
      // OBSERVACIONES
      // ==========================================
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('OBSERVACIONES', margin, yPos)
      yPos += 8

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      // Mostrar observaciones existentes si las hay
      if (hardware.observaciones) {
        const obsLines = doc.splitTextToSize(hardware.observaciones, maxWidth - 10)
        obsLines.forEach((line: string) => {
          doc.text(line, margin + 5, yPos)
          yPos += 5
        })
        yPos += 5
      }

      // Espacio para observaciones adicionales
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      const obsBoxHeight = 30
      doc.rect(margin, yPos, maxWidth, obsBoxHeight)
      
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('(Espacio para observaciones adicionales del cliente)', margin + 2, yPos + 4)
      doc.setTextColor(0, 0, 0)
      
      yPos += obsBoxHeight + 15

      // ==========================================
      // CONFORMIDAD Y FIRMAS
      // ==========================================
      // Verificar si necesitamos nueva página
      if (yPos > pageHeight - 80) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('CONFORMIDAD', margin, yPos)
      yPos += 10

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Certificamos que el equipo descrito fue entregado y recibido en las condiciones mencionadas.', margin, yPos)
      yPos += 15

      // Sección de firmas - Dos columnas
      const col1X = margin
      const col2X = pageWidth / 2 + 10
      const colWidth = (pageWidth - 2 * margin - 20) / 2
      // Aumentamos la altura de la caja de firma y reservamos
      // un área superior para la imagen y un área inferior para
      // nombre y cédula, evitando que la imagen los tape.
      const signatureBoxHeight = 70

      // Calcular áreas internas
      const imageAreaHeight = signatureBoxHeight - 28 // dejar espacio para texto
      const textAreaTopOffset = imageAreaHeight + 6

      // Columna Izquierda - Quien Entrega (sin recuadro)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('FIRMA DE QUIEN ENTREGA', col1X + colWidth / 2, yPos + 6, { align: 'center' })

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const nameYLeft = yPos + textAreaTopOffset + 6
      const nameUnderlineYLeft = nameYLeft + 4
      const cedulaYLeft = nameUnderlineYLeft + 6
      const cedulaUnderlineYLeft = cedulaYLeft + 4

      // Valores que ya existen en la sección superior
      const entregaFirmaNombre = entregadoPor?.nombre || currentUserName || ''
      const entregaFirmaCedula = entregadoPor?.cedula || ''

      doc.text('Nombre:', col1X + 5, nameYLeft)
      if (entregaFirmaNombre) {
        // Mostrar el nombre encima de la línea
        doc.setFont('helvetica', 'normal')
        doc.text(this.truncateText(entregaFirmaNombre, 30), col1X + 5, nameYLeft + 3)
      }
      doc.text('_________________________________', col1X + 5, nameUnderlineYLeft)

      doc.text('Cédula:', col1X + 5, cedulaYLeft)
      if (entregaFirmaCedula) {
        doc.setFont('helvetica', 'normal')
        doc.text(entregaFirmaCedula, col1X + 5, cedulaYLeft + 3)
      }
      doc.text('_________________________________', col1X + 5, cedulaUnderlineYLeft)

      // Columna Derecha - Quien Recibe (sin recuadro)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('FIRMA DE QUIEN RECIBE', col2X + colWidth / 2, yPos + 6, { align: 'center' })

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const nameYRight = yPos + textAreaTopOffset + 6
      const nameUnderlineYRight = nameYRight + 4
      const cedulaYRight = nameUnderlineYRight + 6
      const cedulaUnderlineYRight = cedulaYRight + 4

      // Valores para quien recibe (calculados arriba en la función)
      const recibeFirmaNombre = (data as any).recibidoPor?.nombre || hardware.persona_responsable || ''
      const recibeFirmaCedula = (data as any).recibidoPor?.cedula || ''

      doc.text('Nombre:', col2X + 5, nameYRight)
      if (recibeFirmaNombre) {
        doc.setFont('helvetica', 'normal')
        doc.text(this.truncateText(recibeFirmaNombre, 30), col2X + 5, nameYRight + 3)
      }
      doc.text('_________________________________', col2X + 5, nameUnderlineYRight)

      doc.text('Cédula:', col2X + 5, cedulaYRight)
      if (recibeFirmaCedula) {
        doc.setFont('helvetica', 'normal')
        doc.text(recibeFirmaCedula, col2X + 5, cedulaYRight + 3)
      }
      doc.text('_________________________________', col2X + 5, cedulaUnderlineYRight)

      // Si se tienen imágenes de firma, intentar incrustarlas dentro de las cajas
      try {
        const genUrl = (data as any).generadorFirmaUrl || null
        const cliUrl = (data as any).clienteFirmaUrl || null

        // Ajustar anchura máxima de la imagen y altura para mantener ambas del mismo tamaño
        const imgMaxWidth = Math.min(120, colWidth - 20)
        const imgMaxHeight = imageAreaHeight - 6

        // Helper: fetch image and return DataURL, adding cache-bust
        const fetchImageAsDataUrl = async (url: string) => {
          try {
            const cacheUrl = url + (url.includes('?') ? '&' : '?') + `t=${Date.now()}`
            const resp = await fetch(cacheUrl, { cache: 'no-store' })
            if (!resp.ok) throw new Error('Failed to fetch image')
            const blob = await resp.blob()
            return await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          } catch (err) {
            console.warn('fetchImageAsDataUrl error', err)
            return null
          }
        }

        if (genUrl) {
          const dataUrl = await fetchImageAsDataUrl(genUrl)
          if (dataUrl) {
            const imgWidth = imgMaxWidth
            const imgHeight = imgMaxHeight
            const imgX = col1X + (colWidth - imgWidth) / 2
            const imgY = yPos + 6
            doc.addImage(dataUrl, 'PNG', imgX, imgY, imgWidth, imgHeight)
          }
        }

        if (cliUrl) {
          const dataUrl = await fetchImageAsDataUrl(cliUrl)
          if (dataUrl) {
            const imgWidth = imgMaxWidth
            const imgHeight = imgMaxHeight
            const imgX = col2X + (colWidth - imgWidth) / 2
            const imgY = yPos + 6
            doc.addImage(dataUrl, 'PNG', imgX, imgY, imgWidth, imgHeight)
          }
        }
      } catch (e) {
        // Si la imagen no se puede cargar, no bloquear el flujo
        console.warn('No se pudo incrustar imagen de firma en PDF', e)
      }

      yPos += signatureBoxHeight + 15

      // ==========================================
      // PIE DE PÁGINA
      // ==========================================
      const footerY = pageHeight - 15
      doc.setDrawColor(41, 128, 185)
      doc.setLineWidth(0.5)
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('SILVERLIGHT COLOMBIA - Sistema de Gestión de Activos Tecnológicos', pageWidth / 2, footerY, { align: 'center' })
      doc.text(`Generado el: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth / 2, footerY + 4, { align: 'center' })

      // Descargar PDF
      const filename = `ActaEntrega_${hardware.name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`
      doc.save(filename)
    } catch (error) {
      console.error('Error generating delivery acta PDF:', error)
      throw new Error('Failed to generate delivery acta PDF')
    }
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

  /**
   * Helper: Formatea campos de software que pueden ser string JSON u objeto
   */
  private static formatSoftwareField(field: any): string {
    if (!field) return 'No especificado'
    
    try {
      // Si es un string, intentar parsearlo como JSON
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field)
          // Si tiene nombre, usarlo
          if (parsed.nombre) {
            return parsed.nombre
          }
          return field
        } catch {
          // Si no es JSON, retornar el string tal cual
          return field
        }
      }
      
      // Si ya es un objeto
      if (typeof field === 'object' && field !== null) {
        if (field.nombre) return field.nombre
        if (field.name) return field.name
        if (field.version) return field.version
      }
      
      return String(field)
    } catch {
      return 'No especificado'
    }
  }

  /**
   * Helper: Trunca texto largo añadiendo elipsis
   */
  private static truncateText(text: string, maxLength: number): string {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 1) + '…'
  }
}
