import { createClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase con privilegios de servicio para operaciones administrativas
 * SOLO usar en el servidor o en operaciones que requieran privilegios elevados
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL y SERVICE_ROLE_KEY son requeridos para operaciones administrativas')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
