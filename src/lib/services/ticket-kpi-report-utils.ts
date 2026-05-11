import type { TicketWithRelations } from '@/lib/services/tickets'

export interface TicketKpiRow {
  id: string
  ticketNumber: string
  fecha: string
  actividad: string
  tiempoRespuesta: string
  tiempoSolucion: string
  criticidad: string
  cumple: 'Si' | 'No' | 'Pendiente'
  personaQueRecibe: string
  priorityCode: 'P1' | 'P2' | 'P3' | 'P4'
  priorityLabel: string
  categoryLabel: string
  responseMinutes: number | null
  resolutionMinutes: number | null
}

interface SlaConfig {
  code: 'P1' | 'P2' | 'P3' | 'P4'
  label: string
  responseTargetMinutes: number
  resolutionTargetMinutes: number
}

interface PriorityBucket {
  code: 'P1' | 'P2' | 'P3' | 'P4'
  label: string
  responseTargetLabel: string
  resolutionTargetLabel: string
  total: number
  responseWithin: number
  responseEvaluated: number
  resolutionWithin: number
  resolutionEvaluated: number
}

export interface TicketKpiReportData {
  rows: TicketKpiRow[]
  total: number
  priorityDistribution: Record<'P1' | 'P2' | 'P3' | 'P4', number>
  categoryDistribution: Record<'Hardware' | 'Software' | 'Red' | 'Accesos' | 'Otro', number>
  responseCompliance: {
    within: number
    evaluated: number
    percentage: number
    averageMinutes: number
  }
  resolutionCompliance: {
    within: number
    evaluated: number
    percentage: number
  }
  priorityBuckets: PriorityBucket[]
  criticalIncidents: number
  mainMetrics: {
    open: number
    pendingConfirmation: number
    solved: number
    critical: number
  }
}

const SLA_CONFIG: Record<string, SlaConfig> = {
  critical: {
    code: 'P1',
    label: 'Crítico',
    responseTargetMinutes: 15,
    resolutionTargetMinutes: 240,
  },
  high: {
    code: 'P2',
    label: 'Alto',
    responseTargetMinutes: 30,
    resolutionTargetMinutes: 240,
  },
  medium: {
    code: 'P3',
    label: 'Medio',
    responseTargetMinutes: 60,
    resolutionTargetMinutes: 1440,
  },
  low: {
    code: 'P4',
    label: 'Bajo',
    responseTargetMinutes: 120,
    resolutionTargetMinutes: 4320,
  },
}

const CATEGORY_LABELS: Record<string, 'Hardware' | 'Software' | 'Red' | 'Accesos' | 'Otro'> = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Red',
  access: 'Accesos',
  other: 'Otro',
}

const DEFAULT_SLA = SLA_CONFIG.low

const toPercentage = (value: number, total: number): number => {
  if (total === 0) return 0
  return Number(((value / total) * 100).toFixed(1))
}

const getSlaConfig = (priority?: string): SlaConfig => SLA_CONFIG[priority || ''] || DEFAULT_SLA

const getPriorityCodeOrder = (code: 'P1' | 'P2' | 'P3' | 'P4'): number => {
  if (code === 'P1') return 1
  if (code === 'P2') return 2
  if (code === 'P3') return 3
  return 4
}

const normalizeDuration = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(',', '.')
    .replace(/hrs?/g, 'h')
    .replace(/horas?/g, 'h')
    .replace(/mins?/g, 'm')
    .replace(/minutos?/g, 'm')

export const parseDurationToMinutes = (rawValue?: string): number | null => {
  if (!rawValue) return null
  const value = normalizeDuration(rawValue)
  if (!value) return null

  const hhmmMatch = value.match(/^(\d{1,2}):(\d{1,2})$/)
  if (hhmmMatch) {
    const hours = Number(hhmmMatch[1])
    const minutes = Number(hhmmMatch[2])
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
    return hours * 60 + minutes
  }

  let totalMinutes = 0
  let hasMatch = false

  const dayMatch = value.match(/(\d+(?:\.\d+)?)\s*d/)
  if (dayMatch) {
    totalMinutes += Number(dayMatch[1]) * 24 * 60
    hasMatch = true
  }

  const hourMatches = value.matchAll(/(\d+(?:\.\d+)?)\s*h/g)
  for (const match of hourMatches) {
    totalMinutes += Number(match[1]) * 60
    hasMatch = true
  }

  const minuteMatches = value.matchAll(/(\d+(?:\.\d+)?)\s*m/g)
  for (const match of minuteMatches) {
    totalMinutes += Number(match[1])
    hasMatch = true
  }

  if (hasMatch) return Math.round(totalMinutes)

  const numericOnly = Number(value)
  if (!Number.isNaN(numericOnly)) {
    return Math.round(numericOnly)
  }

  return null
}

const getCategoryLabel = (category?: string): 'Hardware' | 'Software' | 'Red' | 'Accesos' | 'Otro' =>
  CATEGORY_LABELS[category || ''] || 'Otro'

const getPersonaRecibe = (ticket: TicketWithRelations, assignedUserNames?: Record<string, string>) => {
  if (ticket.assigned_to && assignedUserNames?.[ticket.assigned_to]) {
    return assignedUserNames[ticket.assigned_to]
  }

  if (ticket.assigned_user) {
    const fullName = `${ticket.assigned_user.first_name || ''} ${ticket.assigned_user.last_name || ''}`.trim()
    if (fullName) return fullName
  }

  return 'Sin asignar'
}

const getTicketNumber = (ticket: TicketWithRelations) => ticket.ticket_number || `#${ticket.id.slice(-8)}`

const isOpenStatus = (status?: string) => status === 'open' || status === 'in_progress'
const isSolvedStatus = (status?: string) => status === 'solucionado' || status === 'resolved' || status === 'closed'

const formatTargetLabel = (minutes: number) => {
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60} h`
  }
  return `${minutes} min`
}

export const buildTicketKpiReportData = (
  tickets: TicketWithRelations[],
  assignedUserNames?: Record<string, string>
): TicketKpiReportData => {
  const rows: TicketKpiRow[] = tickets.map((ticket) => {
    const sla = getSlaConfig(ticket.priority)
    const responseMinutes = parseDurationToMinutes(ticket.tiempo_respuesta)
    const resolutionMinutes = parseDurationToMinutes(ticket.tiempo_solucion)

    const hasBothTimes = responseMinutes !== null && resolutionMinutes !== null
    const responseWithin = responseMinutes !== null && responseMinutes <= sla.responseTargetMinutes
    const resolutionWithin = resolutionMinutes !== null && resolutionMinutes <= sla.resolutionTargetMinutes

    let cumple: TicketKpiRow['cumple'] = 'Pendiente'
    if (hasBothTimes) {
      cumple = responseWithin && resolutionWithin ? 'Si' : 'No'
    }

    return {
      id: ticket.id,
      ticketNumber: getTicketNumber(ticket),
      fecha: new Date(ticket.created_at).toLocaleDateString('es-CO'),
      actividad: ticket.title,
      tiempoRespuesta: ticket.tiempo_respuesta || '-',
      tiempoSolucion: ticket.tiempo_solucion || '-',
      criticidad: `${sla.code} - ${sla.label}`,
      cumple,
      personaQueRecibe: getPersonaRecibe(ticket, assignedUserNames),
      priorityCode: sla.code,
      priorityLabel: sla.label,
      categoryLabel: getCategoryLabel(ticket.category),
      responseMinutes,
      resolutionMinutes,
    }
  })

  rows.sort((a, b) => getPriorityCodeOrder(a.priorityCode) - getPriorityCodeOrder(b.priorityCode))

  const priorityDistribution: TicketKpiReportData['priorityDistribution'] = {
    P1: rows.filter((row) => row.priorityCode === 'P1').length,
    P2: rows.filter((row) => row.priorityCode === 'P2').length,
    P3: rows.filter((row) => row.priorityCode === 'P3').length,
    P4: rows.filter((row) => row.priorityCode === 'P4').length,
  }

  const categoryDistribution: TicketKpiReportData['categoryDistribution'] = {
    Hardware: rows.filter((row) => row.categoryLabel === 'Hardware').length,
    Software: rows.filter((row) => row.categoryLabel === 'Software').length,
    Red: rows.filter((row) => row.categoryLabel === 'Red').length,
    Accesos: rows.filter((row) => row.categoryLabel === 'Accesos').length,
    Otro: rows.filter((row) => row.categoryLabel === 'Otro').length,
  }

  const responseEvaluatedRows = rows.filter((row) => row.responseMinutes !== null)
  const responseWithinRows = responseEvaluatedRows.filter((row) => {
    const sla = getSlaConfig(row.priorityCode === 'P1' ? 'critical' : row.priorityCode === 'P2' ? 'high' : row.priorityCode === 'P3' ? 'medium' : 'low')
    return (row.responseMinutes || 0) <= sla.responseTargetMinutes
  })

  const resolutionEvaluatedRows = rows.filter((row) => row.resolutionMinutes !== null)
  const resolutionWithinRows = resolutionEvaluatedRows.filter((row) => {
    const sla = getSlaConfig(row.priorityCode === 'P1' ? 'critical' : row.priorityCode === 'P2' ? 'high' : row.priorityCode === 'P3' ? 'medium' : 'low')
    return (row.resolutionMinutes || 0) <= sla.resolutionTargetMinutes
  })

  const priorityBucketsBase: PriorityBucket[] = [
    { code: 'P1', label: 'Crítico', responseTargetLabel: formatTargetLabel(SLA_CONFIG.critical.responseTargetMinutes), resolutionTargetLabel: formatTargetLabel(SLA_CONFIG.critical.resolutionTargetMinutes), total: 0, responseWithin: 0, responseEvaluated: 0, resolutionWithin: 0, resolutionEvaluated: 0 },
    { code: 'P2', label: 'Alto', responseTargetLabel: formatTargetLabel(SLA_CONFIG.high.responseTargetMinutes), resolutionTargetLabel: formatTargetLabel(SLA_CONFIG.high.resolutionTargetMinutes), total: 0, responseWithin: 0, responseEvaluated: 0, resolutionWithin: 0, resolutionEvaluated: 0 },
    { code: 'P3', label: 'Medio', responseTargetLabel: formatTargetLabel(SLA_CONFIG.medium.responseTargetMinutes), resolutionTargetLabel: formatTargetLabel(SLA_CONFIG.medium.resolutionTargetMinutes), total: 0, responseWithin: 0, responseEvaluated: 0, resolutionWithin: 0, resolutionEvaluated: 0 },
    { code: 'P4', label: 'Bajo', responseTargetLabel: formatTargetLabel(SLA_CONFIG.low.responseTargetMinutes), resolutionTargetLabel: formatTargetLabel(SLA_CONFIG.low.resolutionTargetMinutes), total: 0, responseWithin: 0, responseEvaluated: 0, resolutionWithin: 0, resolutionEvaluated: 0 },
  ]

  const bucketMap = new Map(priorityBucketsBase.map((bucket) => [bucket.code, bucket]))

  rows.forEach((row) => {
    const bucket = bucketMap.get(row.priorityCode)
    if (!bucket) return

    bucket.total += 1

    const sla = row.priorityCode === 'P1'
      ? SLA_CONFIG.critical
      : row.priorityCode === 'P2'
        ? SLA_CONFIG.high
        : row.priorityCode === 'P3'
          ? SLA_CONFIG.medium
          : SLA_CONFIG.low

    if (row.responseMinutes !== null) {
      bucket.responseEvaluated += 1
      if (row.responseMinutes <= sla.responseTargetMinutes) {
        bucket.responseWithin += 1
      }
    }

    if (row.resolutionMinutes !== null) {
      bucket.resolutionEvaluated += 1
      if (row.resolutionMinutes <= sla.resolutionTargetMinutes) {
        bucket.resolutionWithin += 1
      }
    }
  })

  const responseMinutes = responseEvaluatedRows
    .map((row) => row.responseMinutes || 0)
    .reduce((acc, value) => acc + value, 0)

  const responseAverage = responseEvaluatedRows.length > 0
    ? Math.round(responseMinutes / responseEvaluatedRows.length)
    : 0

  return {
    rows,
    total: rows.length,
    priorityDistribution,
    categoryDistribution,
    responseCompliance: {
      within: responseWithinRows.length,
      evaluated: responseEvaluatedRows.length,
      percentage: toPercentage(responseWithinRows.length, responseEvaluatedRows.length),
      averageMinutes: responseAverage,
    },
    resolutionCompliance: {
      within: resolutionWithinRows.length,
      evaluated: resolutionEvaluatedRows.length,
      percentage: toPercentage(resolutionWithinRows.length, resolutionEvaluatedRows.length),
    },
    priorityBuckets: priorityBucketsBase,
    criticalIncidents: priorityDistribution.P1,
    mainMetrics: {
      open: tickets.filter((ticket) => isOpenStatus(ticket.status as string)).length,
      pendingConfirmation: tickets.filter((ticket) => ticket.status === 'pendiente_confirmacion').length,
      solved: tickets.filter((ticket) => isSolvedStatus(ticket.status as string)).length,
      critical: tickets.filter((ticket) => ticket.priority === 'critical').length,
    },
  }
}

export const formatMinutesToReadable = (minutes: number): string => {
  if (minutes <= 0) return '0 min'
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} h`
  }

  return `${hours} h ${remainingMinutes} min`
}
