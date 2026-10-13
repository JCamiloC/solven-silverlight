import type { HardwareAsset } from '@/types'
import type { AlertCategory, ExpirationAlert } from './types'
import { classifySeverity, daysUntilDueDate, isVisibleInDashboard } from './classify-expiration'

type LicenseLike = {
  nombre?: string
  sl?: boolean
  fecha_vencimiento?: string
}

function parseLicenseField(raw: unknown): LicenseLike | null {
  if (!raw) return null
  try {
    if (typeof raw === 'string') return JSON.parse(raw) as LicenseLike
    if (typeof raw === 'object') return raw as LicenseLike
  } catch {
    return null
  }
  return null
}

/** software_extra en BD puede ser array o JSON string (como en hardware-form). */
function parseSoftwareExtraList(raw: unknown): LicenseLike[] {
  if (!raw) return []
  let arr: unknown = raw
  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      arr = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []
  return arr.map((entry) => {
    const parsed = parseLicenseField(entry) || (entry as LicenseLike)
    return {
      nombre: parsed?.nombre ?? '',
      sl: parsed?.sl ?? false,
      fecha_vencimiento: parsed?.fecha_vencimiento ?? '',
    }
  })
}

function pushLicenseAlert(params: {
  asset: HardwareAsset
  clientName: string
  category: AlertCategory
  typeLabel: string
  license: LicenseLike
  now: Date
  out: ExpirationAlert[]
  extraKey?: string
}) {
  const { asset, clientName, category, typeLabel, license, now, out, extraKey } = params
  if (!license || license.sl === true) return
  if (!license.fecha_vencimiento?.trim()) return

  const dueDate = license.fecha_vencimiento.slice(0, 10)
  const daysUntil = daysUntilDueDate(dueDate, now)
  const severity = classifySeverity(daysUntil)
  if (!severity || !isVisibleInDashboard(daysUntil)) return

  const productName = license.nombre?.trim() || typeLabel
  out.push({
    id: `${category}:${asset.id}:${extraKey || typeLabel}:${dueDate}`,
    category,
    clientId: asset.client_id,
    clientName,
    label: `${typeLabel} · ${productName} · ${asset.name}`,
    dueDate,
    daysUntil,
    severity,
    href: `/dashboard/clientes/${asset.client_id}/hardware/${asset.id}/seguimientos`,
  })
}

export function extractHardwareExpirationAlerts(
  assets: HardwareAsset[],
  clientNames: Map<string, string>,
  now = new Date()
): ExpirationAlert[] {
  const out: ExpirationAlert[] = []

  for (const asset of assets) {
    const clientName = clientNames.get(asset.client_id) || 'Cliente'

    if (asset.warranty_expiry) {
      const dueDate = asset.warranty_expiry.slice(0, 10)
      const daysUntil = daysUntilDueDate(dueDate, now)
      const severity = classifySeverity(daysUntil)
      if (severity && isVisibleInDashboard(daysUntil)) {
        out.push({
          id: `hardware_warranty:${asset.id}:${dueDate}`,
          category: 'hardware_warranty',
          clientId: asset.client_id,
          clientName,
          label: `Garantía · ${asset.name}`,
          dueDate,
          daysUntil,
          severity,
          href: `/dashboard/clientes/${asset.client_id}/hardware/${asset.id}/seguimientos`,
        })
      }
    }

    const so = parseLicenseField(asset.sistema_operativo)
    pushLicenseAlert({
      asset,
      clientName,
      category: 'hardware_os',
      typeLabel: 'Sistema operativo',
      license: so || {},
      now,
      out,
    })

    const office = parseLicenseField(asset.ms_office)
    pushLicenseAlert({
      asset,
      clientName,
      category: 'hardware_office',
      typeLabel: 'MS Office',
      license: office || {},
      now,
      out,
    })

    const av = parseLicenseField(asset.antivirus)
    pushLicenseAlert({
      asset,
      clientName,
      category: 'hardware_antivirus',
      typeLabel: 'Antivirus',
      license: av || {},
      now,
      out,
    })

    parseSoftwareExtraList(asset.software_extra).forEach((license, index) => {
      pushLicenseAlert({
        asset,
        clientName,
        category: 'hardware_software_extra',
        typeLabel: 'Software adicional',
        license,
        now,
        out,
        extraKey: `extra-${index}`,
      })
    })
  }

  return out
}
