import { createBrowserClient } from '@supabase/ssr'

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
      return createBrowserClient(
        'https://placeholder.supabase.co',
        'placeholder-key'
      )
    }
    
    throw new Error('Supabase URL y ANON_KEY son requeridos. Verificar configuración en .env.local')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}