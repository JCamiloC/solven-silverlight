import { SESSION_CONFIG } from '@/lib/session-config'

let inFlightRequests = 0

/** Notifica actividad real (p. ej. peticiones autenticadas) para reiniciar el timeout de inactividad. */
export function notifySessionActivity() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SESSION_CONFIG.ACTIVITY_EVENT))
}

/** Marca el inicio de una petición autenticada: cuenta como actividad y evita logout a mitad de operación. */
export function beginSessionRequest() {
  if (typeof window === 'undefined') return
  inFlightRequests += 1
  notifySessionActivity()
  window.dispatchEvent(
    new CustomEvent(SESSION_CONFIG.REQUEST_ACTIVITY_EVENT, {
      detail: { inFlight: inFlightRequests },
    })
  )
}

/** Marca el fin de una petición autenticada. */
export function endSessionRequest() {
  if (typeof window === 'undefined') return
  inFlightRequests = Math.max(0, inFlightRequests - 1)
  notifySessionActivity()
  window.dispatchEvent(
    new CustomEvent(SESSION_CONFIG.REQUEST_ACTIVITY_EVENT, {
      detail: { inFlight: inFlightRequests },
    })
  )
}

export function getInFlightSessionRequests(): number {
  return inFlightRequests
}
