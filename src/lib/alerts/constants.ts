/** Días calendario antes del vencimiento → alerta amarilla */
export const ALERT_WARNING_DAYS = 30

/** Días calendario después del vencimiento → correo diario (digest) */
export const ALERT_EXPIRED_EMAIL_DAYS = 7

export const DEFAULT_ALERTS_SUPPORT_EMAIL = 'soporte@silverlight.com.co'

/** Solo destinatario de digests; el remitente lo define SMTP (desarrollo@). */
export function getAlertsSupportEmail(): string {
  return process.env.ALERTS_SUPPORT_EMAIL?.trim() || DEFAULT_ALERTS_SUPPORT_EMAIL
}
