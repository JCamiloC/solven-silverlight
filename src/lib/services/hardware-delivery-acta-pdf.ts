/**
 * Servicio para generar PDF de Acta de Entrega de Hardware
 * Genera un documento formal para registrar la entrega de equipos
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { jsPDF } from 'jspdf'

import { HardwareAsset } from '@/types'
import { getSoftwareDisplayName } from '@/lib/utils'

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
  // Datos de la empresa cliente
  empresaCliente?: {
    nombre: string
    nit: string
  }
  // URLs de firmas digitales
  generadorFirmaUrl?: string | null
  clienteFirmaUrl?: string | null
}

export class HardwareDeliveryActaPDF {
  /**
   * Genera el acta de entrega del hardware en PDF
   */
  static async generateActa(data: ActaDeliveryData): Promise<void> {
    try {
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
      // INFORMACIÓN DE ENTREGA (EMPRESA)
      // ==========================================
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('DATOS DE ENTREGA', margin, yPos)
      yPos += 8

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')

      // Empresa que Entrega
      doc.setFont('helvetica', 'bold')
      doc.text('ENTREGADO POR:', margin, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      
      const empresaNombre = data.empresaCliente?.nombre || 'SILVERLIGHT COLOMBIA'
      const empresaNit = data.empresaCliente?.nit || 'No especificado'
      
      doc.text(`Empresa: ${empresaNombre}`, margin + 5, yPos)
      yPos += 6
      doc.text(`NIT: ${empresaNit}`, margin + 5, yPos)
      yPos += 10

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
        ['Sistema Operativo:', getSoftwareDisplayName(hardware.sistema_operativo)],
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
        const safeValue = String(value ?? 'N/A')
        const valueText = safeValue.length > 50 ? safeValue.substring(0, 50) + '...' : safeValue
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
        softwareList.push(`Microsoft Office: ${getSoftwareDisplayName(hardware.ms_office)}`)
      }
      if (hardware.antivirus) {
        softwareList.push(`Antivirus: ${getSoftwareDisplayName(hardware.antivirus)}`)
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
      const signatureBoxHeight = 90
      const imageTopY = yPos + 10
      const imageAreaHeight = 34
      const textTopY = imageTopY + imageAreaHeight + 10

      // Columna Izquierda - Quien Entrega (Empresa)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('FIRMA DE QUIEN ENTREGA', col1X + colWidth / 2, yPos + 6, { align: 'center' })

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const nameYLeft = textTopY
      const nameUnderlineYLeft = nameYLeft + 4
      const cedulaYLeft = nameUnderlineYLeft + 6
      const cedulaUnderlineYLeft = cedulaYLeft + 4

      // Mostrar datos de quien entrega
      const entregaNombre = data.entregadoPor?.nombre || 'No especificado'
      const entregaCedula = data.entregadoPor?.cedula || 'No especificada'

      doc.text('Nombre:', col1X + 5, nameYLeft)
      doc.setFont('helvetica', 'bold')
      doc.text(this.truncateText(entregaNombre, 30), col1X + 5, nameYLeft + 3)
      doc.setFont('helvetica', 'normal')
      doc.text('_________________________________', col1X + 5, nameUnderlineYLeft)

      doc.text('Cédula:', col1X + 5, cedulaYLeft)
      doc.setFont('helvetica', 'bold')
      doc.text(this.truncateText(entregaCedula, 30), col1X + 5, cedulaYLeft + 3)
      doc.setFont('helvetica', 'normal')
      doc.text('_________________________________', col1X + 5, cedulaUnderlineYLeft)

      // Columna Derecha - Quien Recibe
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('FIRMA DE QUIEN RECIBE', col2X + colWidth / 2, yPos + 6, { align: 'center' })

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const nameYRight = textTopY
      const nameUnderlineYRight = nameYRight + 4
      const cedulaYRight = nameUnderlineYRight + 6
      const cedulaUnderlineYRight = cedulaYRight + 4

      const recibeNombre = data.recibidoPor?.nombre || 'No especificado'
      const recibeCedula = data.recibidoPor?.cedula || 'No especificada'

      doc.text('Nombre:', col2X + 5, nameYRight)
      doc.setFont('helvetica', 'bold')
      doc.text(this.truncateText(recibeNombre, 30), col2X + 5, nameYRight + 3)
      doc.setFont('helvetica', 'normal')
      doc.text('_________________________________', col2X + 5, nameUnderlineYRight)

      doc.text('Cédula:', col2X + 5, cedulaYRight)
      doc.setFont('helvetica', 'bold')
      doc.text(this.truncateText(recibeCedula, 30), col2X + 5, cedulaYRight + 3)
      doc.setFont('helvetica', 'normal')
      doc.text('_________________________________', col2X + 5, cedulaUnderlineYRight)

      // ==========================================
      // FIRMAS DIGITALES
      // ==========================================
      // Si se tienen imágenes de firma, intentar incrustarlas dentro de las cajas
      try {
        const genUrl = (data as any).generadorFirmaUrl || null
        const cliUrl = (data as any).clienteFirmaUrl || null

        // Ajustar anchura máxima de la imagen y altura para mantener ambas del mismo tamaño
        const imgMaxWidth = Math.min(120, colWidth - 20)
        const imgMaxHeight = imageAreaHeight

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

        const getImageFormat = (dataUrl: string): 'PNG' | 'JPEG' => {
          const lower = dataUrl.toLowerCase()
          return lower.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        }

        if (genUrl) {
          const dataUrl = await fetchImageAsDataUrl(genUrl)
          if (dataUrl) {
            const imgWidth = imgMaxWidth
            const imgHeight = imgMaxHeight
            const imgX = col1X + (colWidth - imgWidth) / 2
            const imgY = imageTopY
            doc.addImage(dataUrl, getImageFormat(dataUrl), imgX, imgY, imgWidth, imgHeight)
          }
        }

        if (cliUrl) {
          const dataUrl = await fetchImageAsDataUrl(cliUrl)
          if (dataUrl) {
            const imgWidth = imgMaxWidth
            const imgHeight = imgMaxHeight
            const imgX = col2X + (colWidth - imgWidth) / 2
            const imgY = imageTopY
            doc.addImage(dataUrl, getImageFormat(dataUrl), imgX, imgY, imgWidth, imgHeight)
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
      throw new Error(
        `Failed to generate delivery acta PDF: ${error instanceof Error ? error.message : 'unknown error'}`
      )
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
   * Helper: Trunca texto largo añadiendo elipsis
   */
  private static truncateText(text: string, maxLength: number): string {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 1) + '…'
  }
}
