import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Timeout para queries de Supabase (15 segundos)
const QUERY_TIMEOUT = 15000

// Wrapper para agregar timeout a las queries de Supabase
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
      
      // Si es el método 'from', interceptamos para agregar timeout
      if (prop === 'from') {
        return (...args: any[]) => {
          const queryBuilder = (value as any).apply(target, args)
          
          // Interceptar métodos de query
          return new Proxy(queryBuilder, {
            get(qbTarget: any, qbProp) {
              const qbValue = qbTarget[qbProp]
              
              // Si es un método que retorna Promise (single, select, etc)
              if (typeof qbValue === 'function' && 
                  ['single', 'maybeSingle', 'then', 'catch'].includes(qbProp as string)) {
                return function(...qbArgs: any[]) {
                  const result = qbValue.apply(qbTarget, qbArgs)
                  
                  // Si retorna Promise, agregar timeout
                  if (result && typeof result.then === 'function') {
                    return withTimeout(result)
                  }
                  return result
                }
              }
              
              return qbValue
            }
          })
        }
      }
      
      return value
    }
  })
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Verificar que las variables de entorno estén configuradas
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl.includes('placeholder') || 
      supabaseAnonKey.includes('placeholder')) {
    console.warn('⚠️  Supabase no configurado correctamente. Usar variables reales en .env.local')
    
    // En desarrollo, permitir crear cliente con valores placeholder
    if (process.env.NODE_ENV === 'development') {
      const client = createBrowserClient(
        'https://placeholder.supabase.co',
        'placeholder-key'
      )
      return createClientWithTimeout(client)
    }
    
    throw new Error('Supabase URL y ANON_KEY son requeridos. Verificar configuración en .env.local')
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Auto refresh token antes de que expire
      autoRefreshToken: true,
      // Persistir sesión
      persistSession: true,
      // Detectar cambios en sesión
      detectSessionInUrl: true,
    },
    // Timeout global para requests HTTP
    global: {
      fetch: (url, options = {}) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT)
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))
      },
    },
  })

  return createClientWithTimeout(client)
}