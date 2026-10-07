import { createClient } from '@/lib/supabase/client'
import { hasSupabaseAuthCookieHint } from '@/lib/auth/auth-cookie'

/** Renovar con margen amplio (formularios 10–15 min entre campos). */
const REFRESH_IF_EXPIRES_IN_SECONDS = 10 * 60
const SESSION_CHECK_TIMEOUT_MS = 20_000
/** Si un ensure previo se colgó, no bloquear guardados nuevos indefinidamente. */
const IN_FLIGHT_STALE_MS = 25_000
const SAVE_REFRESH_ATTEMPTS = 3

let inFlight: Promise<boolean> | null = null
let inFlightStartedAt = 0

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Session check timeout after ${ms}ms`))
    }, ms)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export function abortStaleSessionCheck() {
  inFlight = null
  inFlightStartedAt = 0
}

function notifySessionRefreshed() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('solven:session-refreshed'))
}

async function tryRefreshSession(): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await withTimeout(supabase.auth.refreshSession(), SESSION_CHECK_TIMEOUT_MS)
  const ok = Boolean(data.session?.access_token) && !error
  if (ok) notifySessionRefreshed()
  return ok
}

/**
 * Renueva el JWT si está vencido o por vencer.
 * No toca estado de React: sirve para guardar un formulario después de dejarlo abierto.
 */
export async function ensureFreshSession(): Promise<boolean> {
  if (inFlight && Date.now() - inFlightStartedAt < IN_FLIGHT_STALE_MS) {
    return inFlight
  }

  inFlightStartedAt = Date.now()
  inFlight = (async () => {
    try {
      const supabase = createClient()
      const {
        data: { session },
        error,
      } = await withTimeout(supabase.auth.getSession(), SESSION_CHECK_TIMEOUT_MS)

      if (!error && session?.access_token) {
        const expiresIn = (session.expires_at ?? 0) - Math.floor(Date.now() / 1000)
        if (expiresIn > REFRESH_IF_EXPIRES_IN_SECONDS) return true

        try {
          const refreshed = await tryRefreshSession()
          if (refreshed) return true
        } catch {
          // refresh falló; solo confiar en token si aún no venció
        }
        return expiresIn > 15
      }

      if (hasSupabaseAuthCookieHint()) {
        return tryRefreshSession()
      }

      return false
    } catch {
      if (hasSupabaseAuthCookieHint()) {
        try {
          return await tryRefreshSession()
        } catch {
          return false
        }
      }
      return false
    }
  })()

  try {
    return await inFlight
  } finally {
    inFlight = null
  }
}

/**
 * Antes de guardar: fuerza refresh con reintentos (sin recargar la página).
 */
export async function ensureSessionForSave(): Promise<boolean> {
  if (typeof window === 'undefined') return true
  if (!hasSupabaseAuthCookieHint()) return true

  abortStaleSessionCheck()

  for (let attempt = 0; attempt < SAVE_REFRESH_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(350 * attempt)
      abortStaleSessionCheck()
    }

    try {
      const refreshed = await tryRefreshSession()
      if (refreshed) return true
    } catch {
      // siguiente intento
    }

    try {
      const ok = await ensureFreshSession()
      if (ok) return true
    } catch {
      // siguiente intento
    }
  }

  return false
}
