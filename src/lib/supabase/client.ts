import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { beginSessionRequest, endSessionRequest } from '@/lib/session-activity'
import { toQueryError } from '@/lib/query-errors'

// Un solo timeout por request (evita Abort + Promise.race a 15s que dejaba mutaciones colgadas)
const QUERY_TIMEOUT_MS = 45_000
const MUTATION_TIMEOUT_MS = 75_000
const STORAGE_TIMEOUT_MS = 120_000

function isAuthRequest(url: string): boolean {
  return url.includes('/auth/v1/')
}

function isStorageRequest(url: string): boolean {
  return url.includes('/storage/v1/')
}

function resolveTimeoutMs(url: string, options?: RequestInit): number {
  if (isStorageRequest(url)) return STORAGE_TIMEOUT_MS

  const method = (options?.method || 'GET').toUpperCase()
  if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    return MUTATION_TIMEOUT_MS
  }

  return QUERY_TIMEOUT_MS
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
        const isSupabaseRequest = Boolean(supabaseUrl && requestUrl.startsWith(supabaseUrl))

        // Auth (getSession/refresh): fetch plano. Contarlo como actividad
        // reprogramaba timeouts y competía con GoTrue.
        if (isAuthRequest(requestUrl)) {
          return fetch(url, options)
        }

        const timeoutMs = resolveTimeoutMs(requestUrl, options)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          controller.abort(new Error(`Request timeout after ${timeoutMs}ms`))
        }, timeoutMs)

        const externalSignal = options.signal
        if (externalSignal) {
          if (externalSignal.aborted) {
            clearTimeout(timeoutId)
            const reason = externalSignal.reason
            return Promise.reject(
              reason instanceof Error
                ? reason
                : new DOMException('The operation was aborted.', 'AbortError')
            )
          }
          externalSignal.addEventListener(
            'abort',
            () => {
              controller.abort(
                externalSignal.reason ??
                  new DOMException('The operation was aborted.', 'AbortError')
              )
            },
            { once: true }
          )
        }

        if (isSupabaseRequest) {
          beginSessionRequest()
        }

        return fetch(url, {
          ...options,
          signal: controller.signal,
        })
          .catch((error) => {
            // Cancelación real del caller (React Query unmount): preservar AbortError
            if (externalSignal?.aborted) {
              throw error
            }
            throw toQueryError(error)
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
