import { createClient } from '@/lib/supabase/client'
import { Ticket } from '@/types'

const supabase = createClient()

export class TicketService {
  async getAll(): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        client:clients(name),
        creator:profiles!created_by(first_name, last_name),
        assignee:profiles!assigned_to(first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getById(id: string): Promise<Ticket | null> {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        client:clients(name),
        creator:profiles!created_by(first_name, last_name),
        assignee:profiles!assigned_to(first_name, last_name)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async create(ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .insert(ticket)
      .select(`
        *,
        client:clients(name),
        creator:profiles!created_by(first_name, last_name),
        assignee:profiles!assigned_to(first_name, last_name)
      `)
      .single()

    if (error) throw error
    return data
  }

  async update(id: string, updates: Partial<Ticket>): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        client:clients(name),
        creator:profiles!created_by(first_name, last_name),
        assignee:profiles!assigned_to(first_name, last_name)
      `)
      .single()

    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async getStats() {
    const { data: total } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })

    const { data: open } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')

    const { data: inProgress } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress'])

    const { data: solved } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['solucionado', 'resolved', 'closed'])

    return {
      total: total?.length || 0,
      open: open?.length || 0,
      inProgress: inProgress?.length || 0,
      solved: solved?.length || 0,
    }
  }

  async getRecentTickets(limit: number = 10): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        client:clients(name),
        creator:profiles!created_by(first_name, last_name),
        assignee:profiles!assigned_to(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }
}

export const ticketService = new TicketService()