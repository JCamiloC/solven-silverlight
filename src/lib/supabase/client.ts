import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { beginSessionRequest, endSessionRequest } from '@/lib/session-activity'

// Un solo timeout por request (evita Abort + Promise.race a 15s que dejaba mutaciones colgadas)
const QUERY_TIMEOUT_MS = 45_000
const MUTATION_TIMEOUT_MS = 75_000
const AUTH_FETCH_TIMEOUT_MS = 45_000
const STORAGE_TIMEOUT_MS = 120_000

function isAuthRequest(url: string): boolean {
  return url.includes('/auth/v1/')
}

function isStorageRequest(url: string): boolean {
  return url.includes('/storage/v1/')
}

function resolveTimeoutMs(url: string, options?: RequestInit): number {
  if (isAuthRequest(url)) return AUTH_FETCH_TIMEOUT_MS
  if (isStorageRequest(url)) return STORAGE_TIMEOUT_MS

  const method = (options?.method || 'GET').toUpperCase()
  if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    return MUTATION_TIMEOUT_MS
  }

  return QUERY_TIMEOUT_MS
}

function toUserFacingFetchError(error: unknown): Error {
  if (error instanceof Error) {
    const aborted =
      error.name === 'AbortError' ||
      /aborted|abort|timeout/i.test(error.message)

    if (aborted) {
      return new Error(
        'La petición tardó demasiado o se interrumpió. Revisa tu conexión e intenta de nuevo.'
      )
    }
    return error
  }

  return new Error('Error de red al contactar el servidor')
}

let browserClient: SupabaseClient | null = null

export function createClient() {
  if (browserClient) {
    return browserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseAnonKey.includes('placeholder')
  ) {
    console.warn('⚠️  Supabase no configurado correctamente. Usar variables reales en .env.local')

    if (process.env.NODE_ENV === 'development') {
      browserClient = createBrowserClient(
        'https://placeholder.supabase.co',
        'placeholder-key'
      )
      return browserClient
    }

    throw new Error('Supabase URL y ANON_KEY son requeridos. Verificar configuración en .env.local')
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      fetch: (url, options = {}) => {
        const requestUrl = typeof url === 'string' ? url : url.toString()
        const timeoutMs = resolveTimeoutMs(requestUrl, options)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
        const isSupabaseRequest = Boolean(supabaseUrl && requestUrl.startsWith(supabaseUrl))

        const externalSignal = options.signal
        if (externalSignal) {
          if (externalSignal.aborted) {
            controller.abort()
          } else {
            externalSignal.addEventListener('abort', () => controller.abort(), { once: true })
          }
        }

        if (isSupabaseRequest) {
          beginSessionRequest()
        }

        return fetch(url, {
          ...options,
          signal: controller.signal,
        })
          .catch((error) => {
            throw toUserFacingFetchError(error)
          })
          .finally(() => {
            clearTimeout(timeoutId)
            if (isSupabaseRequest) {
              endSessionRequest()
            }
          })
      },
    },
  })

  return browserClient
}
