import { hasSupabaseAuthCookieHint } from '@/lib/auth/auth-cookie'
import { ensureFreshSession } from '@/lib/auth/ensure-fresh-session'

export const SESSION_EXPIRED_MUTATION_MSG =
  'Tu sesión expiró o no se pudo renovar. Copia los datos del formulario, recarga e inicia sesión de nuevo.'

const ENSURE_SESSION_RACE_MS = 18_000

/**
 * Antes de mutaciones autenticadas (Supabase): renueva JWT si hace falta.
 * Si no hay cookie de sesión, no hace nada (p. ej. firma pública de actas).
 */
export async function ensureSessionBeforeMutation(): Promise<boolean> {
  if (typeof window === 'undefined') return true
  if (!hasSupabaseAuthCookieHint()) return true

  return Promise.race([
    ensureFreshSession(),
    new Promise<boolean>((_, reject) => {
      setTimeout(
        () => reject(new Error('La verificación de sesión tardó demasiado. Intenta de nuevo.')),
        ENSURE_SESSION_RACE_MS
      )
    }),
  ])
}
