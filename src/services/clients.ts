import { createClient } from '@/lib/supabase/client'
import { Client } from '@/types'

const supabase = createClient()

/** Normaliza NIT a solo dígitos (ignora guiones, espacios y puntos). */
export function normalizeNit(nit?: string | null): string {
  return (nit || '').replace(/[^0-9]/g, '')
}

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  return (
    error.code === '23505' ||
    /clients_nit_unique_normalized|duplicate key/i.test(error.message || '')
  )
}

export interface ClientInsert {
  name: string
  email: string
  phone?: string
  address?: string
  contact_person: string
  nit?: string
  mantenimientos_al_anio?: number
  client_type?: 'on_demand_software' | 'on_demand_hardware' | 'on_demand_ambos' | 'contrato_software' | 'contrato_hardware' | 'contrato_ambos' | 'no_aplica'
}

export interface ClientUpdate {
  name?: string
  email?: string
  phone?: string
  address?: string
  contact_person?: string
  nit?: string
  mantenimientos_al_anio?: number
  client_type?: 'on_demand_software' | 'on_demand_hardware' | 'on_demand_ambos' | 'contrato_software' | 'contrato_hardware' | 'contrato_ambos' | 'no_aplica'
  acta_generador_nombre?: string
  acta_generador_cedula?: string
  acta_generador_firma_url?: string
  acta_generador_actualizado_en?: string
}

export class ClientService {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select(
        'id, name, email, phone, address, contact_person, nit, mantenimientos_al_anio, client_type, created_at, updated_at'
      )
      .order('name')

    if (error) throw error
    return data || []
  }

  async getById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async getUsersByClientId(clientId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /** Busca otro cliente con el mismo NIT (comparación por dígitos). */
  async findByNit(
    nit: string,
    excludeId?: string
  ): Promise<Pick<Client, 'id' | 'name' | 'nit'> | null> {
    const normalized = normalizeNit(nit)
    if (!normalized) return null

    const { data, error } = await supabase
      .from('clients')
      .select('id, name, nit')
      .not('nit', 'is', null)

    if (error) throw error

    const match = (data || []).find((client) => {
      if (excludeId && client.id === excludeId) return false
      return normalizeNit(client.nit) === normalized
    })

    return match || null
  }

  private async assertNitAvailable(nit: string | undefined, excludeId?: string) {
    const trimmed = (nit || '').trim()
    const normalized = normalizeNit(trimmed)

    if (!normalized) {
      throw new Error('El NIT es requerido')
    }

    const existing = await this.findByNit(trimmed, excludeId)
    if (existing) {
      throw new Error(
        `Ya existe un cliente con el NIT ${existing.nit || trimmed}: ${existing.name}`
      )
    }

    return trimmed
  }

  async create(client: ClientInsert): Promise<Client> {
    const nit = await this.assertNitAvailable(client.nit)

    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, nit })
      .select()
      .single()

    if (error) {
      if (isUniqueViolation(error)) {
        throw new Error(`Ya existe un cliente registrado con el NIT ${nit}`)
      }
      throw error
    }
    return data
  }

  async update(id: string, updates: ClientUpdate): Promise<Client> {
    const payload = { ...updates }

    if (Object.prototype.hasOwnProperty.call(updates, 'nit')) {
      payload.nit = await this.assertNitAvailable(updates.nit, id)
    }

    const { data: updateData, error: updateError } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()

    if (updateError) {
      if (isUniqueViolation(updateError)) {
        throw new Error(
          `Ya existe un cliente registrado con el NIT ${payload.nit || updates.nit || ''}`
        )
      }
      throw updateError
    }

    if (!updateData || updateData.length === 0) {
      throw new Error('No se pudo actualizar el cliente. Verifica los permisos.')
    }

    return updateData[0]
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('clients').delete().eq('id', id)

    if (error) throw error
  }
}

export const clientService = new ClientService()
