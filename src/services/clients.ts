import { createClient } from '@/lib/supabase/client'
import { Client } from '@/types'

const supabase = createClient()

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
      .select('*')
      .order('name')

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

  async create(client: ClientInsert): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async update(id: string, updates: ClientUpdate): Promise<Client> {
    // Primero hacer el update
    const { data: updateData, error: updateError } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (updateError) {
      throw updateError
    }
    
    if (!updateData || updateData.length === 0) {
      throw new Error('No se pudo actualizar el cliente. Verifica los permisos.')
    }
    
    return updateData[0]
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

export const clientService = new ClientService()