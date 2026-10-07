import { ensureSessionForSave, validateSessionUsable } from '@/lib/auth/ensure-fresh-session'

/** Mostrar solo si fallaron todos los reintentos automáticos de refresh. */
export const SESSION_RETRY_SAVE_MSG =
  'No pudimos renovar la sesión automáticamente. Pulsa Guardar otra vez; tus datos siguen en el formulario.'

export const SESSION_VERIFY_SLOW_MSG =
  'La renovación de sesión tardó demasiado. Pulsa Guardar otra vez (no hace falta recargar).'

/** @deprecated usar SESSION_RETRY_SAVE_MSG */
export const SESSION_EXPIRED_MUTATION_MSG = SESSION_RETRY_SAVE_MSG

const ENSURE_SESSION_RACE_MS = 35_000
/** Evita doble ensure lock + MutationCache en el mismo guardado. */
const ENSURE_DEDUPE_MS = 2_500

let lastSuccessfulEnsureAt = 0

export function resetSessionEnsureDedupe() {
  lastSuccessfulEnsureAt = 0
}

export function isLikelySessionError(error: unknown): boolean {
  if (!error) return false
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : String(error)

  const lower = message.toLowerCase()
  return (
    lower.includes('jwt') ||
    lower.includes('session') ||
    lower.includes('sesión') ||
    lower.includes('not authenticated') ||
    lower.includes('invalid claim') ||
    lower.includes('refresh token') ||
    (typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status?: number }).status === 401)
  )
}

/**
 * Antes de mutaciones autenticadas (Supabase): renueva JWT con reintentos.
 */
export async function ensureSessionBeforeMutation(): Promise<boolean> {
  if (typeof window === 'undefined') return true

  if (Date.now() - lastSuccessfulEnsureAt < ENSURE_DEDUPE_MS) {
    return validateSessionUsable()
  }

  try {
    const ok = await Promise.race([
      ensureSessionForSave(),
      new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error(SESSION_VERIFY_SLOW_MSG)), ENSURE_SESSION_RACE_MS)
      }),
    ])

    if (ok) {
      lastSuccessfulEnsureAt = Date.now()
    } else {
      resetSessionEnsureDedupe()
    }
    return ok
  } catch (error) {
    resetSessionEnsureDedupe()
    if (error instanceof Error && error.message === SESSION_VERIFY_SLOW_MSG) {
      throw error
    }
    return false
  }
}
