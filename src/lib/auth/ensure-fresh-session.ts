import { createClient } from '@/lib/supabase/client'
import { hasSupabaseAuthCookieHint } from '@/lib/auth/auth-cookie'

/** Renovar con margen amplio (formularios 10–15 min entre campos). */
const REFRESH_IF_EXPIRES_IN_SECONDS = 10 * 60
const SESSION_CHECK_TIMEOUT_MS = 15_000
/** Si un ensure previo se colgó, no bloquear guardados nuevos indefinidamente. */
/** Debe ser mayor que SESSION_CHECK_TIMEOUT_MS para no soltar refresh duplicados. */
const IN_FLIGHT_STALE_MS = 25_000

let inFlight: Promise<boolean> | null = null
let inFlightStartedAt = 0

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

async function tryRefreshSession(): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await withTimeout(supabase.auth.refreshSession(), SESSION_CHECK_TIMEOUT_MS)
  return Boolean(data.session?.access_token) && !error
}

/**
 * Renueva el JWT si está vencido o por vencer.
 * No toca estado de React: sirve para guardar un formulario después de dejarlo abierto.
 */
export async function ensureFreshSession(): Promise<boolean> {
  if (
    inFlight &&
    Date.now() - inFlightStartedAt < IN_FLIGHT_STALE_MS
  ) {
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
