import { createClient } from '@/lib/supabase/client'
import { Client } from '@/types'

const supabase = createClient()

export class ClientService {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
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
}

export const clientService = new ClientService()