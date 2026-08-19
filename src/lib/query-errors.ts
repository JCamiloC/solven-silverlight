/** Errores de fetch abortado/timeout que no deben dejar queries colgadas en loading. */

export function isAbortLikeError(error: unknown): boolean {
  if (!error) return false

  if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      /aborted|abort|timeout|tardó demasiado|se interrumpió/i.test(error.message)
    )
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '')
    const name = 'name' in error ? String((error as { name?: unknown }).name || '') : ''
    return name === 'AbortError' || /aborted|abort|timeout|tardó demasiado|se interrumpió/i.test(message)
  }

  return false
}

export function toQueryError(error: unknown): Error {
  if (isAbortLikeError(error)) {
    return new Error(
      'La petición tardó demasiado o se interrumpió. Revisa tu conexión e intenta de nuevo.'
    )
  }

  if (error instanceof Error) return error

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return new Error(String((error as { message?: unknown }).message || 'Error desconocido'))
  }

  return new Error('Error de red al contactar el servidor')
}
