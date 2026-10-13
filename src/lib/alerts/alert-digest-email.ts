import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ExpirationAlert } from './types'

const categoryLabels: Record<ExpirationAlert['category'], string> = {
  hardware_warranty: 'Garantía hardware',
  hardware_os: 'SO (equipo)',
  hardware_office: 'Office (equipo)',
  hardware_antivirus: 'Antivirus (equipo)',
  hardware_software_extra: 'Software adicional (equipo)',
  software_license: 'Licencia software',
  app_domain: 'Dominio',
  app_hosting: 'Hosting',
  app_ssl: 'SSL',
  maintenance_scheduled: 'Mantenimiento',
}

function formatDueDate(dueDate: string) {
  return format(parseISO(dueDate.slice(0, 10)), 'dd/MM/yyyy', { locale: es })
}

function renderRows(items: ExpirationAlert[]): string {
  if (items.length === 0) {
    return '<p>No hay ítems en esta categoría.</p>'
  }

  const rows = items
    .map((item) => {
      const status =
        item.severity === 'expired'
          ? `<span style="color:#b91c1c;font-weight:600">Vencido (${Math.abs(item.daysUntil)} d)</span>`
          : `<span style="color:#ca8a04;font-weight:600">En ${item.daysUntil} d</span>`
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.clientName}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${categoryLabels[item.category]}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.label}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${formatDueDate(item.dueDate)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${status}</td>
      </tr>`
    })
    .join('')

  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="background:#f3f4f6;text-align:left">
        <th style="padding:8px">Cliente</th>
        <th style="padding:8px">Tipo</th>
        <th style="padding:8px">Detalle</th>
        <th style="padding:8px">Vence</th>
        <th style="padding:8px">Estado</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
}

export function buildWeeklyUpcomingDigestHtml(items: ExpirationAlert[], appUrl: string): string {
  return `
    <div style="font-family:Arial,sans-serif;color:#111827;max-width:900px">
      <h2 style="margin:0 0 8px">Resumen semanal — próximos vencimientos</h2>
      <p style="color:#4b5563;margin:0 0 16px">
        ${items.length} ítem(s) vencen en los próximos 30 días calendario.
      </p>
      ${renderRows(items)}
      <p style="margin-top:20px;font-size:12px;color:#6b7280">
        Panel: <a href="${appUrl}/dashboard">${appUrl}/dashboard</a>
      </p>
    </div>
  `
}

export function buildDailyExpiredDigestHtml(items: ExpirationAlert[], appUrl: string): string {
  return `
    <div style="font-family:Arial,sans-serif;color:#111827;max-width:900px">
      <h2 style="margin:0 0 8px">Alerta diaria — vencimientos activos</h2>
      <p style="color:#4b5563;margin:0 0 16px">
        ${items.length} ítem(s) vencido(s) requieren atención (seguimiento diario durante la primera semana).
      </p>
      ${renderRows(items)}
      <p style="margin-top:20px;font-size:12px;color:#6b7280">
        Panel: <a href="${appUrl}/dashboard">${appUrl}/dashboard</a>
      </p>
    </div>
  `
}
