import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import { ALERT_EXPIRED_EMAIL_DAYS, ALERT_WARNING_DAYS } from './constants'
import type { AlertSeverity } from './types'

export function daysUntilDueDate(dueDate: string, now = new Date()): number {
  const due = startOfDay(parseISO(dueDate.slice(0, 10)))
  const today = startOfDay(now)
  return differenceInCalendarDays(due, today)
}

export function classifySeverity(daysUntil: number): AlertSeverity | null {
  if (daysUntil >= 1 && daysUntil <= ALERT_WARNING_DAYS) return 'warning'
  if (daysUntil <= 0) return 'expired'
  return null
}

/** Ítems visibles en dashboard (próximos 30 días o ya vencidos). */
export function isVisibleInDashboard(daysUntil: number): boolean {
  return daysUntil <= ALERT_WARNING_DAYS
}

/** Ítems incluidos en digest semanal (ventana amarilla). */
export function isEligibleForWeeklyDigest(daysUntil: number): boolean {
  return daysUntil >= 1 && daysUntil <= ALERT_WARNING_DAYS
}

/** Ítems incluidos en digest diario post-vencimiento (7 días calendario). */
export function isEligibleForExpiredDailyDigest(daysUntil: number): boolean {
  return daysUntil <= 0 && daysUntil >= -(ALERT_EXPIRED_EMAIL_DAYS - 1)
}
