import type { SupabaseClient } from '@supabase/supabase-js'
import { hasFullClientCatalogAccess } from '@/lib/auth/staff-client-access'
import type { UserRole } from '@/types'

export interface AlertScope {
  role: UserRole
  clientIds: string[] | null
}

export async function resolveAlertScope(
  supabase: SupabaseClient,
  userId: string
): Promise<AlertScope | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, client_id')
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle()

  if (error || !profile?.role) return null

  const role = profile.role as UserRole

  if (role === 'cliente') {
    if (!profile.client_id) return null
    return { role, clientIds: [profile.client_id as string] }
  }

  if (hasFullClientCatalogAccess(role)) {
    return { role, clientIds: null }
  }

  if (role === 'agente_soporte') {
    const profileId = profile.id as string
    const { data: links, error: linkError } = await supabase
      .from('support_agent_clients')
      .select('client_id')
      .eq('profile_id', profileId)

    if (linkError) {
      if (linkError.code === '42P01') return { role, clientIds: [] }
      throw linkError
    }

    const clientIds = (links || []).map((row) => row.client_id as string)
    return { role, clientIds }
  }

  return null
}
