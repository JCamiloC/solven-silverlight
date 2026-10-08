import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types'
import { hasFullClientCatalogAccess } from '@/lib/auth/staff-client-access'
import type { UserRole } from '@/types'

export const supportAgentClientKeys = {
  all: ['support-agent-clients'] as const,
  byProfile: (profileId: string) => [...supportAgentClientKeys.all, profileId] as const,
}

export class SupportAgentClientsService {
  static async getClientIdsForProfile(profileId: string): Promise<string[]> {
    if (!profileId) return []

    const supabase = createClient()
    const { data, error } = await supabase
      .from('support_agent_clients')
      .select('client_id')
      .eq('profile_id', profileId)

    if (error) {
      if (error.code === '42P01') {
        console.warn('[support_agent_clients] Tabla no existe; ejecuta scripts/setup-support-agent-clients.mjs')
        return []
      }
      throw error
    }

    return (data || []).map((row) => row.client_id as string)
  }

  static async getClientsForProfile(profileId: string): Promise<Client[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('support_agent_clients')
      .select(
        `
        client_id,
        clients (
          id, name, email, phone, address, contact_person, nit,
          mantenimientos_al_anio, client_type, created_at, updated_at
        )
      `
      )
      .eq('profile_id', profileId)

    if (error) {
      if (error.code === '42P01') return []
      throw error
    }

    const clients = (data || []).flatMap((row) => {
      const nested = row.clients as Client | Client[] | null
      if (!nested) return []
      return Array.isArray(nested) ? nested : [nested]
    })

    return clients.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }

  static async setClientIdsForProfile(profileId: string, clientIds: string[]): Promise<void> {
    if (!profileId) return

    const supabase = createClient()
    const uniqueIds = [...new Set(clientIds.filter(Boolean))]

    const { error: deleteError } = await supabase
      .from('support_agent_clients')
      .delete()
      .eq('profile_id', profileId)

    if (deleteError) {
      if (deleteError.code === '42P01') {
        throw new Error(
          'Falta configurar la tabla support_agent_clients en Supabase (script setup-support-agent-clients.mjs).'
        )
      }
      throw deleteError
    }

    if (uniqueIds.length === 0) return

    const { error: insertError } = await supabase.from('support_agent_clients').insert(
      uniqueIds.map((clientId) => ({
        profile_id: profileId,
        client_id: clientId,
      }))
    )

    if (insertError) throw insertError
  }

  static async getAccessibleClients(role: UserRole | undefined, profileId: string | undefined): Promise<Client[]> {
    const supabase = createClient()

    if (hasFullClientCatalogAccess(role)) {
      const { data, error } = await supabase
        .from('clients')
        .select(
          'id, name, email, phone, address, contact_person, nit, mantenimientos_al_anio, client_type, created_at, updated_at'
        )
        .order('name')

      if (error) throw error
      return data || []
    }

    if (role === 'agente_soporte' && profileId) {
      return this.getClientsForProfile(profileId)
    }

    return []
  }
}
