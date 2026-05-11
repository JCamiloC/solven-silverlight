import { createClient } from '@/lib/supabase/client'
import { MaintenanceReportFilters, MaintenanceReportRow } from '@/types'
import { getSoftwareDisplayName } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ImageRun } from 'docx'
import { saveAs } from 'file-saver'
import { getReportLogoForPdf, getReportLogoForWord } from '@/lib/services/report-logo'

const supabase = createClient()

export class MaintenanceReportService {
  private static parseDateInput(value: string): { isoDate: string; day: string; month: string; year: string; timestamp: number } {
    if (!value || typeof value !== 'string') {
      throw new Error('Rango de fechas inválido')
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
    if (!match) {
      throw new Error('Formato de fecha inválido en el filtro del reporte')
    }

    const [, year, month, day] = match
    const yearNum = Number(year)
    const monthNum = Number(month)
    const dayNum = Number(day)

    const utcDate = new Date(Date.UTC(yearNum, monthNum - 1, dayNum))
    const validDate =
      utcDate.getUTCFullYear() === yearNum &&
      utcDate.getUTCMonth() + 1 === monthNum &&
      utcDate.getUTCDate() === dayNum

    if (!validDate) {
      throw new Error('Formato de fecha inválido en el filtro del reporte')
    }

    return {
      isoDate: `${year}-${month}-${day}`,
      day,
      month,
      year,
      timestamp: utcDate.getTime(),
    }
  }

  private static buildPeriodLabel(startDate: string, endDate: string): string {
    const start = this.parseDateInput(startDate)
    const end = this.parseDateInput(endDate)
    return `${start.day}/${start.month}/${start.year} - ${end.day}/${end.month}/${end.year}`
  }

  /**
   * Obtiene el reporte de mantenimiento de hardware para un cliente y mes específico
   */
  static async getHardwareMaintenanceReport(
    filters: MaintenanceReportFilters
  ): Promise<MaintenanceReportRow[]> {
    try {
      const { clientId, startDate, endDate } = filters

      const start = this.parseDateInput(startDate)
      const end = this.parseDateInput(endDate)

      if (start.timestamp > end.timestamp) {
        throw new Error('La fecha de inicio no puede ser mayor que la fecha de fin')
      }

      const startDateISO = `${start.isoDate}T00:00:00.000Z`
      const endDateISO = `${end.isoDate}T23:59:59.999Z`

      let query = supabase
        .from('hardware_seguimientos')
        .select(`
          id,
          hardware_id,
          tipo,
          detalle,
          accion_recomendada,
          accion_recomendada_estado,
          actividades,
          fecha_registro,
          hardware:hardware_assets!hardware_seguimientos_hardware_id_fkey (
            id,
            name,
            type,
            procesador,
            memoria_ram,
            disco_duro,
            sistema_operativo,
            ms_office,
            antivirus,
            persona_responsable,
            otro_periferico,
            client_id
          )
        `)
        .gte('fecha_registro', startDateISO)
        .lte('fecha_registro', endDateISO)
        .order('fecha_registro', { ascending: true })

      if (filters.seguimientoTipo && filters.seguimientoTipo !== 'all') {
        query = query.eq('tipo', filters.seguimientoTipo)
      }

      if (filters.accionEstado && filters.accionEstado !== 'all') {
        query = query.eq('accion_recomendada_estado', filters.accionEstado)
      }

      // Obtener seguimientos del mes con información de hardware
      const { data: seguimientos, error } = await query

      if (error) throw error

      // Filtrar por cliente y transformar datos
      const filteredData = seguimientos?.filter(
        (seg: any) => seg.hardware?.client_id === clientId
      ) || []

      return filteredData.map((seg: any, index: number) => ({
        rowNumber: index + 1,
        usuario: seg.hardware?.persona_responsable || 'No asignado',
        equipoNombre: seg.hardware?.name || 'Sin nombre',
        tipo: seg.hardware?.type || 'N/A',
        seguimientoTipo: seg.tipo || 'N/A',
        procesador: seg.hardware?.procesador || 'No especificado',
        ram: seg.hardware?.memoria_ram || 'No especificada',
        disco: seg.hardware?.disco_duro || 'No especificado',
        tipoPantalla: seg.hardware?.otro_periferico || 'N/A',
        office: getSoftwareDisplayName(seg.hardware?.ms_office),
        antivirus: getSoftwareDisplayName(seg.hardware?.antivirus),
        sistemaOperativo: getSoftwareDisplayName(seg.hardware?.sistema_operativo),
        detalleSeguimiento: seg.detalle || '',
        accionRecomendada: seg.accion_recomendada || 'Sin acción recomendada',
        accionRecomendadaEstado: seg.accion_recomendada_estado || 'no_realizado',
        fechaSeguimiento: seg.fecha_registro,
      }))
    } catch (error) {
      console.error('Error getting hardware maintenance report:', error)
      throw new Error('Error al obtener el reporte de mantenimiento')
    }
  }

  /**
   * Genera PDF del reporte de mantenimiento de hardware
   */
  static async generateMaintenancePDF(
    rows: MaintenanceReportRow[],
    clientName: string,
    startDate: string,
    endDate: string
  ): Promise<void> {
    try {
      const { default: jsPDF } = await import('jspdf')
      await import('jspdf-autotable')

      const doc = new jsPDF('landscape', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 10
      const headerHeight = 48

      const logo = await getReportLogoForPdf(38)
      const logoHeight = logo?.height || 0

      doc.setFillColor(41, 128, 185)
      doc.rect(0, 0, pageWidth, headerHeight, 'F')

      if (logo) {
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(8, 5, logo.width + 4, logo.height + 4, 2, 2, 'F')
        doc.addImage(logo.dataUrl, 'PNG', 10, 7, logo.width, logo.height)
      }

      // Título
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('REPORTE DE MANTENIMIENTO - HARDWARE', pageWidth / 2, logoHeight + 22, { align: 'center' })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(255, 255, 255)
      const periodLabel = this.buildPeriodLabel(startDate, endDate)
      doc.text(`Cliente: ${clientName}`, pageWidth / 2, logoHeight + 30, { align: 'center' })
      doc.text(`Período: ${periodLabel}`, pageWidth / 2, logoHeight + 36, { align: 'center' })
      doc.setTextColor(0, 0, 0)

      // Preparar datos para la tabla
      const tableData = rows.map(row => [
        row.rowNumber,
        row.usuario,
        row.equipoNombre,
        row.tipo,
        row.procesador,
        row.ram,
        row.disco,
        row.tipoPantalla,
        row.office,
        row.antivirus,
        row.sistemaOperativo,
        row.detalleSeguimiento,
      ])

      // Generar tabla
      ;(doc as any).autoTable({
        head: [[
          '#',
          'Usuario',
          'Nombre',
          'Tipo',
          'Procesador',
          'RAM',
          'Disco',
          'Pantalla',
          'Office',
          'Antivirus',
          'S.O.',
          'Detalle Mantenimiento',
        ]],
        body: tableData,
        startY: headerHeight + 8,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 15 },
          4: { cellWidth: 20 },
          5: { cellWidth: 15 },
          6: { cellWidth: 15 },
          7: { cellWidth: 15 },
          8: { cellWidth: 20 },
          9: { cellWidth: 20 },
          10: { cellWidth: 20 },
          11: { cellWidth: 'auto' },
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      })

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        if (logo) {
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(8, 5, logo.width + 4, logo.height + 4, 2, 2, 'F')
          doc.addImage(logo.dataUrl, 'PNG', 10, 7, logo.width, logo.height)
        }
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - margin,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        )
        doc.text(
          `Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
          margin,
          doc.internal.pageSize.getHeight() - 10
        )
      }

      // Descargar PDF
      const filename = `Reporte_Mantenimiento_${clientName.replace(/\s+/g, '_')}_${startDate}_a_${endDate}.pdf`
      doc.save(filename)
    } catch (error) {
      console.error('Error generating maintenance PDF:', error)
      throw new Error('Error al generar el PDF del reporte')
    }
  }

  /**
   * Exporta el reporte a Word (.docx) con formato completo
   */
  static async exportToWord(
    rows: MaintenanceReportRow[],
    clientName: string,
    startDate: string,
    endDate: string
  ): Promise<void> {
    try {
      const periodLabel = this.buildPeriodLabel(startDate, endDate)
      const logo = await getReportLogoForWord(170)

      // TODO: Agregar logo cuando el usuario especifique la ruta
      // const logoPath = '/logos/silverlight-logo.png'
      // const logoBuffer = await fetch(logoPath).then(r => r.arrayBuffer())

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 pulgada
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: [
            ...(logo
              ? [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 240 },
                    children: [
                      new ImageRun({
                        data: logo.bytes.buffer as ArrayBuffer,
                        type: 'png',
                        transformation: {
                          width: logo.width,
                          height: logo.height,
                        },
                      }),
                    ],
                  }),
                ]
              : []),
            // TÍTULO PRINCIPAL
            new Paragraph({
              text: 'MANTENIMIENTO DE INFRAESTRUCTURA',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 200,
              },
            }),

            // FECHA
            new Paragraph({
              text: periodLabel,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400,
              },
            }),

            // 1. ANTECEDENTES
            new Paragraph({
              children: [
                new TextRun({
                  text: '1. ANTECEDENTES',
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: {
                before: 200,
                after: 200,
              },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `${clientName} `,
                  bold: true,
                }),
                new TextRun({
                  text: 'posee una cantidad importante de terminales dentro de sus equipos de cómputo a las cuales hace varios meses no se les realiza una jornada mantenimiento, por lo tanto, se decidió ejecutar una sesión de mantenimientos preventivos en los cuales intervenimos las maquinas en diferentes modalidades, donde cubrimos aspectos como parámetros de limpieza física, revisión de antivirus, desinstalación de componentes no permitidos, instalación y corrección de actualizaciones, optimización de sistemas operativos y eliminación de archivos temporales que pudiesen afectar la experiencia de trabajo de los colaboradores, garantizando así el correcto funcionamiento y prolongar la vida útil de los dispositivos.',
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: {
                after: 400,
              },
            }),

            // 2. PROCEDIMIENTO
            new Paragraph({
              children: [
                new TextRun({
                  text: '2. PROCEDIMIENTO',
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: {
                before: 200,
                after: 200,
              },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: 'Desde SILVERLIGHT COLOMBIA planteamos el diseño de un plan estratégico de trabajo con un cronograma que se cumplió según lo acordado, el cual nos permitió identificar varias oportunidades de mejora con base en los problemas existentes y con el fin de dar oportuna solución uno a uno, empezando con la ejecución de tareas tales como:',
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: {
                after: 200,
              },
            }),

            // Viñeta 1: Limpieza de equipos
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Limpieza de equipos: ',
                  bold: true,
                }),
                new TextRun({
                  text: 'Este procedimiento permite, a nivel interno, que el polvo acumulado por mucho tiempo dentro de la CPU sea evacuado, además de realizar un cambio de solución térmica y limpieza en board y componentes lógicos, lo cual ayuda a que los ventiladores de la maquina trabajen mucho mejor y su temperatura de trabajo se mantenga en índices óptimos, dándole una vida útil más amplia al equipo. Adicionalmente, a nivel externo, se efectúa la limpieza de las pantallas, teclados y mouse de cada estación para descontaminar el área de trabajo de cada usuario.',
                }),
              ],
              bullet: {
                level: 0,
              },
              alignment: AlignmentType.JUSTIFIED,
              spacing: {
                after: 200,
              },
            }),

            // Viñeta 2: Ciberseguridad
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Ciberseguridad: ',
                  bold: true,
                }),
                new TextRun({
                  text: 'Se procede con la ejecución del sistema antivirus, haciendo que el programa efectúe un análisis de cada máquina y verifique, si hay alguna amenaza, esta sea detectada y eliminada, además de hacer ajustes en los estándares de seguridad de la información según la operación lo requiera.',
                }),
              ],
              bullet: {
                level: 0,
              },
              alignment: AlignmentType.JUSTIFIED,
              spacing: {
                after: 200,
              },
            }),

            // Viñeta 3: Optimización
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Optimización del sistema operativo: ',
                  bold: true,
                }),
                new TextRun({
                  text: 'Se procede a realizar un mantenimiento del software que consta de la eliminación de archivos temporales y residuales producto de actualizaciones, navegadores e incluso el mismo procesamiento de datos, hasta la eliminación de programas no utilizados y configuración/actualización en los diferentes programas para acelerar rendimiento del ordenador y verificar la estabilidad y fiabilidad del equipo.',
                }),
              ],
              bullet: {
                level: 0,
              },
              alignment: AlignmentType.JUSTIFIED,
              spacing: {
                after: 200,
              },
            }),

            // Viñeta 4: Licenciamientos
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Licenciamientos: ',
                  bold: true,
                }),
                new TextRun({
                  text: 'Posteriormente se revisan las licencias de antivirus en todos los equipos y se ejecutan análisis de virus; Por último se revisan las actualizaciones de Windows y su respectivo licenciamiento.',
                }),
              ],
              bullet: {
                level: 0,
              },
              alignment: AlignmentType.JUSTIFIED,
              spacing: {
                after: 400,
              },
            }),

            // TABLA DE DATOS
            new Paragraph({
              children: [
                new TextRun({
                  text: '3. DETALLE DE MANTENIMIENTOS REALIZADOS',
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: {
                before: 200,
                after: 200,
              },
            }),

            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                // Header
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: '#', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 5, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Usuario', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 12, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Nombre', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 12, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Tipo', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 8, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Procesador', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 15, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'RAM', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 8, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Disco', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 8, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Pantalla', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 8, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Office', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 8, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Antivirus', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 8, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'S.O.', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 8, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
                // Data rows
                ...rows.map((row, index) => new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: row.rowNumber.toString(), alignment: AlignmentType.CENTER })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.usuario })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.equipoNombre })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.tipo })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.procesador })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.ram })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.disco })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.tipoPantalla })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.office })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.antivirus })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.sistemaOperativo })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                  ],
                })),
              ],
            }),

            // DETALLE DE SEGUIMIENTOS (Segunda tabla)
            new Paragraph({
              children: [
                new TextRun({
                  text: '4. OBSERVACIONES DETALLADAS',
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: {
                before: 400,
                after: 200,
              },
            }),

            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: 'Usuario asignado', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 30, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Detalle del Mantenimiento', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 50, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Acción recomendada', alignment: AlignmentType.CENTER })],
                      shading: { fill: '2980b9' },
                      width: { size: 20, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
                ...rows.map((row, index) => new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: row.usuario })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.detalleSeguimiento, alignment: AlignmentType.JUSTIFIED })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: row.accionRecomendada || 'Sin acción recomendada' })],
                      shading: { fill: index % 2 === 0 ? 'ecf0f1' : 'ffffff' },
                    }),
                  ],
                })),
              ],
            }),
          ],
        }],
      })

      // Generar el archivo
      const blob = await Packer.toBlob(doc)
      const filename = `Reporte_Mantenimiento_${clientName.replace(/\s+/g, '_')}_${startDate}_a_${endDate}.docx`
      saveAs(blob, filename)
    } catch (error) {
      console.error('Error exporting to Word:', error)
      throw new Error('Error al exportar a Word')
    }
  }
}
