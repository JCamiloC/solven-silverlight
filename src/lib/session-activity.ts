import { SESSION_CONFIG } from '@/lib/session-config'

/** Notifica actividad real (p. ej. peticiones autenticadas) para reiniciar el timeout de inactividad. */
export function notifySessionActivity() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SESSION_CONFIG.ACTIVITY_EVENT))
}
