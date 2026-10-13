export type AlertSeverity = 'warning' | 'expired'

export type AlertCategory =
  | 'hardware_warranty'
  | 'hardware_os'
  | 'hardware_office'
  | 'hardware_antivirus'
  | 'hardware_software_extra'
  | 'software_license'
  | 'app_domain'
  | 'app_hosting'
  | 'app_ssl'
  | 'maintenance_scheduled'

export interface ExpirationAlert {
  id: string
  category: AlertCategory
  clientId: string
  clientName: string
  label: string
  dueDate: string
  daysUntil: number
  severity: AlertSeverity
  href: string
}

export interface ExpirationAlertsSummary {
  warningCount: number
  expiredCount: number
  items: ExpirationAlert[]
}
