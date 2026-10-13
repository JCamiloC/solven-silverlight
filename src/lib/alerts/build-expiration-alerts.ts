import type { SupabaseClient } from '@supabase/supabase-js'
import type { HardwareAsset } from '@/types'
import { extractHardwareExpirationAlerts } from './parse-hardware-expirations'
import {
  classifySeverity,
  daysUntilDueDate,
  isEligibleForExpiredDailyDigest,
  isEligibleForWeeklyDigest,
  isVisibleInDashboard,
} from './classify-expiration'
import type { ExpirationAlert, ExpirationAlertsSummary } from './types'

function sortAlerts(items: ExpirationAlert[]): ExpirationAlert[] {
  return [...items].sort((a, b) => a.daysUntil - b.daysUntil)
}

function summarize(items: ExpirationAlert[]): ExpirationAlertsSummary {
  const visible = items.filter((item) => isVisibleInDashboard(item.daysUntil))
  const warningCount = visible.filter((item) => item.severity === 'warning').length
  const expiredCount = visible.filter((item) => item.severity === 'expired').length
  return {
    warningCount,
    expiredCount,
    items: sortAlerts(visible),
  }
}

async function loadClientNames(
  admin: SupabaseClient,
  clientIds: string[] | null
): Promise<Map<string, string>> {
  let query = admin.from('clients').select('id, name')
  if (clientIds && clientIds.length > 0) {
    query = query.in('id', clientIds)
  }
  const { data, error } = await query
  if (error) throw error
  const map = new Map<string, string>()
  for (const row of data || []) {
    map.set(row.id as string, row.name as string)
  }
  return map
}

export async function buildExpirationAlerts(
  admin: SupabaseClient,
  options: { clientIds?: string[] | null; now?: Date } = {}
): Promise<ExpirationAlertsSummary> {
  const now = options.now ?? new Date()
  const filterIds = options.clientIds
  const clientNames = await loadClientNames(admin, filterIds?.length ? filterIds : null)

  let hardwareQuery = admin.from('hardware_assets').select('*')
  if (filterIds?.length) {
    hardwareQuery = hardwareQuery.in('client_id', filterIds)
  }
  const { data: hardwareRows, error: hardwareError } = await hardwareQuery
  if (hardwareError) throw hardwareError

  const alerts: ExpirationAlert[] = extractHardwareExpirationAlerts(
    (hardwareRows || []) as HardwareAsset[],
    clientNames,
    now
  )

  let licenseQuery = admin
    .from('software_licenses')
    .select('id, client_id, name, expiry_date, status, clients(name)')
    .in('status', ['active', 'expired'])
    .not('expiry_date', 'is', null)

  if (filterIds?.length) {
    licenseQuery = licenseQuery.in('client_id', filterIds)
  }

  const { data: licenses, error: licenseError } = await licenseQuery
  if (licenseError) throw licenseError

  for (const row of licenses || []) {
    const dueDate = String(row.expiry_date).slice(0, 10)
    const daysUntil = daysUntilDueDate(dueDate, now)
    const severity = classifySeverity(daysUntil)
    if (!severity || !isVisibleInDashboard(daysUntil)) continue

    const rawClient = row.clients as { name?: string } | { name?: string }[] | null
    const clientName = Array.isArray(rawClient)
      ? rawClient[0]?.name
      : rawClient?.name || clientNames.get(row.client_id as string) || 'Cliente'

    alerts.push({
      id: `software_license:${row.id}:${dueDate}`,
      category: 'software_license',
      clientId: row.client_id as string,
      clientName: clientName || 'Cliente',
      label: `Licencia software · ${row.name}`,
      dueDate,
      daysUntil,
      severity,
      href: `/dashboard/clientes/${row.client_id}/software`,
    })
  }

  let appsQuery = admin
    .from('custom_applications')
    .select('id, client_id, name, domain_expiry_date, hosting_renewal_date, ssl_expiry_date, clients(name)')

  if (filterIds?.length) {
    appsQuery = appsQuery.in('client_id', filterIds)
  }

  const { data: apps, error: appsError } = await appsQuery
  if (appsError) throw appsError

  const appDateFields: Array<{
    field: 'domain_expiry_date' | 'hosting_renewal_date' | 'ssl_expiry_date'
    category: ExpirationAlert['category']
    prefix: string
  }> = [
    { field: 'domain_expiry_date', category: 'app_domain', prefix: 'Dominio' },
    { field: 'hosting_renewal_date', category: 'app_hosting', prefix: 'Hosting' },
    { field: 'ssl_expiry_date', category: 'app_ssl', prefix: 'SSL' },
  ]

  for (const app of apps || []) {
    const rawClient = app.clients as { name?: string } | { name?: string }[] | null
    const clientName = Array.isArray(rawClient)
      ? rawClient[0]?.name
      : rawClient?.name || clientNames.get(app.client_id as string) || 'Cliente'

    for (const { field, category, prefix } of appDateFields) {
      const rawDate = app[field] as string | null | undefined
      if (!rawDate) continue
      const dueDate = rawDate.slice(0, 10)
      const daysUntil = daysUntilDueDate(dueDate, now)
      const severity = classifySeverity(daysUntil)
      if (!severity || !isVisibleInDashboard(daysUntil)) continue

      alerts.push({
        id: `${category}:${app.id}:${dueDate}`,
        category,
        clientId: app.client_id as string,
        clientName: clientName || 'Cliente',
        label: `${prefix} · ${app.name}`,
        dueDate,
        daysUntil,
        severity,
        href: `/dashboard/clientes/${app.client_id}/software/${app.id}`,
      })
    }
  }

  let maintQuery = admin
    .from('client_maintenance_schedule')
    .select('id, client_id, year, slot_number, expected_date, status, clients(name)')
    .in('status', ['pendiente', 'reprogramado'])

  if (filterIds?.length) {
    maintQuery = maintQuery.in('client_id', filterIds)
  }

  const { data: maintenances, error: maintError } = await maintQuery
  if (maintError) throw maintError

  for (const row of maintenances || []) {
    const dueDate = String(row.expected_date).slice(0, 10)
    const daysUntil = daysUntilDueDate(dueDate, now)
    const severity = classifySeverity(daysUntil)
    if (!severity || !isVisibleInDashboard(daysUntil)) continue

    const rawClient = row.clients as { name?: string } | { name?: string }[] | null
    const clientName = Array.isArray(rawClient)
      ? rawClient[0]?.name
      : rawClient?.name || clientNames.get(row.client_id as string) || 'Cliente'

    alerts.push({
      id: `maintenance_scheduled:${row.id}:${dueDate}`,
      category: 'maintenance_scheduled',
      clientId: row.client_id as string,
      clientName: clientName || 'Cliente',
      label: `Mantenimiento programado #${row.slot_number} · ${row.year}`,
      dueDate,
      daysUntil,
      severity,
      href: `/dashboard/clientes/${row.client_id}/mantenimientos`,
    })
  }

  return summarize(alerts)
}

export function filterForWeeklyDigest(summary: ExpirationAlertsSummary): ExpirationAlert[] {
  return summary.items.filter((item) => isEligibleForWeeklyDigest(item.daysUntil))
}

export function filterForExpiredDailyDigest(summary: ExpirationAlertsSummary): ExpirationAlert[] {
  return summary.items.filter((item) => isEligibleForExpiredDailyDigest(item.daysUntil))
}
