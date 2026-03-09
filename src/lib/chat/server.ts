import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ChatViewer } from './types'

const SUPPORT_ROLES = new Set(['agente_soporte', 'lider_soporte', 'administrador'])

export async function getChatContext() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'No autorizado', status: 401 as const }
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, user_id, role, client_id')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle()

  if (profileError || !profile) {
    return { error: 'No se pudo validar el perfil', status: 403 as const }
  }

  const viewer: ChatViewer = {
    userId: user.id,
    role: profile.role,
    canSupport: SUPPORT_ROLES.has(profile.role),
  }

  return {
    supabase,
    admin,
    user,
    profile,
    viewer,
  }
}

export function isSupportRole(role: string | null | undefined): boolean {
  return !!role && SUPPORT_ROLES.has(role)
}
