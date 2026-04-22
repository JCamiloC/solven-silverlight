/**
 * Servicio para generar PDF del Reporte Completo de Hardware
 * Incluye todas las métricas, análisis, alertas y tabla de activos tecnológicos
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { HardwareAsset } from '@/types'
import { HardwareAnalytics } from '@/hooks/use-hardware-analytics'

// Tipo auxiliar para jsPDF con autoTable
type JsPDFWithAutoTable = any

export class HardwareReportPDF {
  /**
   * Genera el reporte completo de hardware en PDF
   */
  static async generateReport(
    assets: HardwareAsset[],
    analytics: HardwareAnalytics,
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
      
      // Crear wrapper para autoTable que actualice lastAutoTable
      const runAutoTable = (options: any) => {
        autoTable(doc, options)
        // Después de llamar autoTable, el doc debería tener lastAutoTable
        if (!doc.lastAutoTable) {
          doc.lastAutoTable = { finalY: options.startY || 0 }
        }
      }

      let yPos = 20
      const pageHeight = doc.internal.pageSize.height
      const margin = 15
      const maxWidth = 180

      // Función helper para agregar nueva página
      const checkNewPage = (neededSpace: number) => {
        if (yPos + neededSpace > pageHeight - 20) {
          doc.addPage()
          yPos = 20
          return true
        }
        return false
      }

      // ==========================================
      // ENCABEZADO PRINCIPAL
      // ==========================================
      doc.setFillColor(41, 128, 185)
      doc.rect(0, 0, 210, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(26)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE DE HARDWARE', 105, 18, { align: 'center' })
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text(clientName, 105, 28, { align: 'center' })

      doc.setFontSize(10)
      doc.text(`Generado: ${format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}`, 105, 35, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      yPos = 50

      // ==========================================
      // MÉTRICAS PRINCIPALES
      // ==========================================
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('MÉTRICAS PRINCIPALES', margin, yPos)
      yPos += 10

      // Crear grid de métricas (2x2)
      const metrics = [
        { label: 'Total Activos tecnológicos', value: analytics.metrics.totalAssets, color: [52, 152, 219] },
        { label: 'Activos', value: analytics.metrics.activeAssets, color: [46, 204, 113] },
        { label: 'En Mantenimiento', value: analytics.metrics.maintenanceAssets, color: [241, 196, 15] },
        { label: 'Áreas Registradas', value: analytics.metrics.uniqueAreas, color: [155, 89, 182] },
      ]

      const boxWidth = 42
      const boxHeight = 25
      const startX = margin
      let currentX = startX
      let currentY = yPos

      metrics.forEach((metric, index) => {
        if (index === 2) {
          currentX = startX
          currentY += boxHeight + 5
        }

        // Fondo de color
        doc.setFillColor(metric.color[0], metric.color[1], metric.color[2])
        doc.rect(currentX, currentY, boxWidth, boxHeight, 'F')

        // Valor
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text(metric.value.toString(), currentX + boxWidth / 2, currentY + 12, { align: 'center' })

        // Label
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(metric.label, currentX + boxWidth / 2, currentY + 19, { align: 'center' })

        currentX += boxWidth + 5
      })

      yPos = currentY + boxHeight + 15
      doc.setTextColor(0, 0, 0)

      // ==========================================
      // ALERTAS Y RECOMENDACIONES
      // ==========================================
      const hasAlerts = analytics.alerts.warrantyExpiringSoon.length > 0 ||
                       analytics.alerts.expiredWarranty.length > 0 ||
                       analytics.alerts.oldEquipment.length > 0 ||
                       analytics.criticalEquipment.length > 0

      if (hasAlerts) {
        checkNewPage(40)
        
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(230, 126, 34)
        doc.text('⚠ ALERTAS Y RECOMENDACIONES', margin, yPos)
        yPos += 10

        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')

        if (analytics.alerts.warrantyExpiringSoon.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.text(`• Garantías por vencer: ${analytics.alerts.warrantyExpiringSoon.length} activo tecnológico(s)`, margin + 5, yPos)
          doc.setFont('helvetica', 'normal')
          yPos += 6
        }

        if (analytics.alerts.expiredWarranty.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.text(`• Garantías vencidas: ${analytics.alerts.expiredWarranty.length} activo tecnológico(s)`, margin + 5, yPos)
          doc.setFont('helvetica', 'normal')
          yPos += 6
        }

        if (analytics.alerts.oldEquipment.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.text(`• Activos tecnológicos antiguos (>5 años): ${analytics.alerts.oldEquipment.length} activo tecnológico(s)`, margin + 5, yPos)
          doc.setFont('helvetica', 'normal')
          yPos += 6
        }

        if (analytics.criticalEquipment.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.text(`• Activos tecnológicos críticos: ${analytics.criticalEquipment.length} activo tecnológico(s)`, margin + 5, yPos)
          doc.setFont('helvetica', 'normal')
          yPos += 6
        }

        yPos += 10
      }

      // ==========================================
      // DISTRIBUCIÓN POR ESTADO
      // ==========================================
      checkNewPage(50)
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('DISTRIBUCIÓN POR ESTADO', margin, yPos)
      yPos += 8

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')

      const statusColors: Record<string, number[]> = {
        active: [46, 204, 113],
        maintenance: [241, 196, 15],
        retired: [231, 76, 60]
      }

      const statusLabels: Record<string, string> = {
        active: 'Activos',
        maintenance: 'En Mantenimiento',
        retired: 'Retirados'
      }

      analytics.statusDistribution.forEach(item => {
        checkNewPage(12)
        
        const color = statusColors[item.status] || [149, 165, 166]
        const label = statusLabels[item.status] || item.status

        // Barra de progreso
        const barWidth = 120
        const barHeight = 8
        const fillWidth = (item.percentage / 100) * barWidth

        // Fondo gris claro
        doc.setFillColor(240, 240, 240)
        doc.rect(margin + 50, yPos - 5, barWidth, barHeight, 'F')

        // Barra de color
        doc.setFillColor(color[0], color[1], color[2])
        doc.rect(margin + 50, yPos - 5, fillWidth, barHeight, 'F')

        // Label y porcentaje
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(`${item.count} (${item.percentage.toFixed(1)}%)`, margin + 172, yPos)

        yPos += 12
      })

      yPos += 10

      // ==========================================
      // DISTRIBUCIÓN POR TIPO Y MARCAS
      // ==========================================
      checkNewPage(60)

      // Distribución por Tipo
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('DISTRIBUCIÓN POR TIPO', margin, yPos)
      yPos += 8

      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')

      analytics.typeDistribution.slice(0, 6).forEach(item => {
        checkNewPage(8)
        doc.text(`• ${item.type}`, margin + 2, yPos)
        doc.text(`${item.count} (${item.percentage.toFixed(1)}%)`, margin + 80, yPos)
        yPos += 6
      })

      yPos += 10

      // Top Marcas
      if (analytics.brandDistribution.length > 0) {
        checkNewPage(50)
        
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('TOP MARCAS', margin + 100, yPos)
        yPos += 8

        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')

        analytics.brandDistribution.slice(0, 6).forEach(item => {
          checkNewPage(8)
          doc.text(`• ${item.brand}`, margin + 102, yPos)
          doc.text(`${item.count} (${item.percentage.toFixed(1)}%)`, margin + 160, yPos)
          yPos += 6
        })

        yPos += 10
      }

      // ==========================================
      // VENCIMIENTOS PRÓXIMOS
      // ==========================================
      if (analytics.upcomingExpirations.length > 0) {
        checkNewPage(60)
        
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('VENCIMIENTOS PRÓXIMOS', margin, yPos)
        yPos += 10

        const expirationData = analytics.upcomingExpirations.map(exp => {
          const isExpired = exp.daysUntilExpiry < 0
          const status = isExpired ? 'Vencido' : `${exp.daysUntilExpiry} días`
          
          return [
            exp.assetName,
            exp.type,
            format(new Date(exp.expirationDate), 'dd/MM/yyyy', { locale: es }),
            status
          ]
        })

        runAutoTable({
          startY: yPos,
          head: [['Activo tecnológico', 'Tipo', 'Fecha Vencimiento', 'Estado']],
          body: expirationData,
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 3 },
          margin: { left: margin, right: margin },
        })

        yPos = doc.lastAutoTable.finalY + 15
      }

      // ==========================================
      // DISTRIBUCIÓN DE SOFTWARE
      // ==========================================
      if (analytics.osAnalysis.length > 0 || analytics.officeAnalysis.length > 0 || analytics.antivirusAnalysis.length > 0) {
        checkNewPage(70)
        
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('DISTRIBUCIÓN DE SOFTWARE', margin, yPos)
        yPos += 10

        // Sistemas Operativos
        if (analytics.osAnalysis.length > 0) {
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.text('Sistemas Operativos', margin + 5, yPos)
          yPos += 6

          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          analytics.osAnalysis.slice(0, 5).forEach(item => {
            checkNewPage(6)
            doc.text(`• ${item.os}`, margin + 8, yPos)
            doc.text(`${item.count}`, margin + 80, yPos)
            yPos += 5
          })
          yPos += 5
        }

        // MS Office
        if (analytics.officeAnalysis.length > 0) {
          checkNewPage(25)
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.text('MS Office', margin + 5, yPos)
          yPos += 6

          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          analytics.officeAnalysis.slice(0, 5).forEach(item => {
            checkNewPage(6)
            doc.text(`• ${item.office}`, margin + 8, yPos)
            doc.text(`${item.count}`, margin + 80, yPos)
            yPos += 5
          })
          yPos += 5
        }

        // Antivirus
        if (analytics.antivirusAnalysis.length > 0) {
          checkNewPage(25)
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.text('Antivirus', margin + 5, yPos)
          yPos += 6

          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          analytics.antivirusAnalysis.slice(0, 5).forEach(item => {
            checkNewPage(6)
            doc.text(`• ${item.antivirus}`, margin + 8, yPos)
            doc.text(`${item.count}`, margin + 80, yPos)
            yPos += 5
          })
          yPos += 10
        }
      }

      // ==========================================
      // TABLA COMPLETA DE ACTIVOS TECNOLÓGICOS
      // ==========================================
      doc.addPage()
      yPos = 20

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('INVENTARIO COMPLETO DE ACTIVOS TECNOLÓGICOS', margin, yPos)
      yPos += 10

      const tableData = assets.map(asset => {
        const statusLabels: Record<string, string> = {
          active: 'Activo',
          maintenance: 'Mantenimiento',
          retired: 'Retirado'
        }

        return [
          asset.name || 'N/A',
          asset.type || 'N/A',
          asset.brand || 'N/A',
          asset.serial_number || 'N/A',
          statusLabels[asset.status] || asset.status,
          asset.persona_responsable || '-',
        ]
      })

      runAutoTable({
        startY: yPos,
        head: [['Nombre', 'Tipo', 'Marca', 'Serie', 'Estado', 'Responsable']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185], 
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 2,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 35 },  // Nombre
          1: { cellWidth: 25 },  // Tipo
          2: { cellWidth: 25 },  // Marca
          3: { cellWidth: 30 },  // Serie
          4: { cellWidth: 25 },  // Estado
          5: { cellWidth: 40 },  // Responsable
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      })

      // Pie de página en todas las páginas
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(
          `Página ${i} de ${pageCount}`,
          105,
          pageHeight - 10,
          { align: 'center' }
        )
      }

      // Guardar PDF
      const fileName = `Reporte_Hardware_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`
      doc.save(fileName)

    } catch (error) {
      console.error('Error al generar PDF del reporte:', error)
      throw error
    }
  }
}
