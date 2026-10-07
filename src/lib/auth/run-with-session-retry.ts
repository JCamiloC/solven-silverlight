import { abortStaleSessionCheck, ensureSessionForSave } from '@/lib/auth/ensure-fresh-session'
import {
  isLikelySessionError,
  resetSessionEnsureDedupe,
  SESSION_RETRY_SAVE_MSG,
} from '@/lib/auth/mutation-session-guard'

/**
 * Ejecuta una mutación; si falla por sesión/JWT, renueva y reintenta una vez.
 */
export async function runWithSessionRetry<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    if (!isLikelySessionError(error)) throw error

    resetSessionEnsureDedupe()
    abortStaleSessionCheck()
    const renewed = await ensureSessionForSave()
    if (!renewed) {
      throw new Error(SESSION_RETRY_SAVE_MSG)
    }

    return await action()
  }
}
