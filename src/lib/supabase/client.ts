import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { beginSessionRequest, endSessionRequest } from '@/lib/session-activity'

// Timeout para queries de datos (15s). Auth usa timeout más largo.
const QUERY_TIMEOUT = 15000
const AUTH_FETCH_TIMEOUT = 30000

function isAuthRequest(url: string): boolean {
  return (
    url.includes('/auth/v1/') ||
    url.includes('/auth/v1/token') ||
    url.includes('/auth/v1/user')
  )
}

// Wrapper para agregar timeout a las queries de Supabase (solo data queries)
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = QUERY_TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout - La sesión puede haber expirado')), timeoutMs)
    ),
  ])
}

// Proxy para interceptar queries y agregar timeout automático
function createClientWithTimeout(client: SupabaseClient) {
  return new Proxy(client, {
    get(target, prop) {
      const value = target[prop as keyof typeof target]

      if (prop === 'from') {
        return (...args: any[]) => {
          const queryBuilder = (value as any).apply(target, args)

          return new Proxy(queryBuilder, {
            get(qbTarget: any, qbProp) {
              const qbValue = qbTarget[qbProp]

              if (
                typeof qbValue === 'function' &&
                ['single', 'maybeSingle', 'then', 'catch'].includes(qbProp as string)
              ) {
                return function (...qbArgs: any[]) {
                  const result = qbValue.apply(qbTarget, qbArgs)

                  if (result && typeof result.then === 'function') {
                    return withTimeout(result)
                  }
                  return result
                }
              }

              return qbValue
            },
          })
        }
      }

      return value
    },
  })
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
      const client = createBrowserClient(
        'https://placeholder.supabase.co',
        'placeholder-key'
      )
      browserClient = createClientWithTimeout(client)
      return browserClient
    }

    throw new Error('Supabase URL y ANON_KEY son requeridos. Verificar configuración en .env.local')
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      fetch: (url, options = {}) => {
        const requestUrl = typeof url === 'string' ? url : url.toString()
        const timeoutMs = isAuthRequest(requestUrl) ? AUTH_FETCH_TIMEOUT : QUERY_TIMEOUT
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
        const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
        const isSupabaseRequest = Boolean(supabaseHost && requestUrl.startsWith(supabaseHost))

        // Respetar signal externo si existe, abortando también el nuestro
        const externalSignal = options.signal
        if (externalSignal) {
          if (externalSignal.aborted) {
            controller.abort()
          } else {
            externalSignal.addEventListener('abort', () => controller.abort(), { once: true })
          }
        }

        // Extender sesión al INICIO de la petición (cargas largas de tickets, etc.)
        if (isSupabaseRequest) {
          beginSessionRequest()
        }

        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId)
          if (isSupabaseRequest) {
            endSessionRequest()
          }
        })
      },
    },
  })

  browserClient = createClientWithTimeout(client)
  return browserClient
}
