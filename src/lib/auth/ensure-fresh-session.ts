import { createClient } from '@/lib/supabase/client'
import { hasSupabaseAuthCookieHint } from '@/lib/auth/auth-cookie'

const REFRESH_IF_EXPIRES_IN_SECONDS = 120
const SESSION_CHECK_TIMEOUT_MS = 8_000

let inFlight: Promise<boolean> | null = null

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

/**
 * Renueva el JWT si está vencido o por vencer.
 * No toca estado de React: sirve para guardar un formulario después de dejarlo abierto.
 */
export async function ensureFreshSession(): Promise<boolean> {
  if (inFlight) return inFlight

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
          const { data, error: refreshError } = await withTimeout(
            supabase.auth.refreshSession(),
            SESSION_CHECK_TIMEOUT_MS
          )
          if (data.session?.access_token && !refreshError) return true
          // Token aún válido aunque el refresh falle (red lenta, mutex, etc.)
          if (expiresIn > 30) return true
        } catch {
          if (expiresIn > 30) return true
        }
      } else if (hasSupabaseAuthCookieHint()) {
        return true
      }

      return false
    } catch {
      return hasSupabaseAuthCookieHint()
    }
  })()

  try {
    return await inFlight
  } finally {
    inFlight = null
  }
}
