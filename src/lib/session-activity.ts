import { SESSION_CONFIG } from '@/lib/session-config'

let inFlightRequests = 0

/**
 * Cuenta peticiones REST en vuelo para no cortar un guardado a mitad.
 * No dispara eventos de "actividad de usuario": eso reprogramaba timers
 * y re-renderizaba el árbol en cada query.
 */
export function beginSessionRequest() {
  if (typeof window === 'undefined') return
  const wasIdle = inFlightRequests === 0
  inFlightRequests += 1
  if (wasIdle) {
    window.dispatchEvent(
      new CustomEvent(SESSION_CONFIG.REQUEST_ACTIVITY_EVENT, {
        detail: { inFlight: inFlightRequests },
      })
    )
  }
}

export function endSessionRequest() {
  if (typeof window === 'undefined') return
  inFlightRequests = Math.max(0, inFlightRequests - 1)
  if (inFlightRequests === 0) {
    window.dispatchEvent(
      new CustomEvent(SESSION_CONFIG.REQUEST_ACTIVITY_EVENT, {
        detail: { inFlight: 0 },
      })
    )
  }
}

export function getInFlightSessionRequests(): number {
  return inFlightRequests
}
