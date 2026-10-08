import type { User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types'

/** Perfil mínimo desde JWT/metadata cuando aún no llegó la fila de `profiles`. */
export function buildFallbackProfile(user: User): Profile {
  const metadata = user.user_metadata || {}
  const roleFromMeta = metadata.role as UserRole | undefined
  const firstName = (metadata.first_name as string | undefined) || 'Usuario'
  const lastName = (metadata.last_name as string | undefined) || ''

  return {
    id: user.id,
    user_id: user.id,
    client_id: metadata.client_id as string | undefined,
    email: user.email || '',
    first_name: firstName,
    last_name: lastName,
    role: roleFromMeta || 'cliente',
    avatar_url: metadata.avatar_url as string | undefined,
    totp_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export function resolveEffectiveProfile(
  user: User | null,
  profile: Profile | null
): Profile | null {
  if (profile) return profile
  if (user) return buildFallbackProfile(user)
  return null
}

export function userHasAllowedRole(
  user: User | null,
  profile: Profile | null,
  allowedRoles: UserRole[]
): boolean {
  if (allowedRoles.length === 0) return true
  const effective = resolveEffectiveProfile(user, profile)
  if (!effective) return false
  return allowedRoles.includes(effective.role)
}
