import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Ticket {
  id: string
  client_id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
  category: 'hardware' | 'software' | 'network' | 'access' | 'other'
  assigned_to?: string
  created_by: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface TicketInsert {
  client_id: string
  title: string
  description: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  status?: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
  category: 'hardware' | 'software' | 'network' | 'access' | 'other'
  assigned_to?: string
  created_by: string
}

export interface TicketUpdate {
  title?: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  status?: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
  category?: 'hardware' | 'software' | 'network' | 'access' | 'other'
  assigned_to?: string
  resolved_at?: string
  updated_at?: string
}

export interface TicketWithRelations extends Ticket {
  client?: {
    id: string
    name: string
    contact_email: string
  }
  assigned_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  created_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  comments?: {
    id: string
    comment: string
    created_by: string
    created_at: string
    is_internal: boolean
    user: {
      first_name: string
      last_name: string
      email: string
    }
  }[]
}

export class TicketsService {
  static async getAll(): Promise<TicketWithRelations[]> {
    // Primero intentar con consulta simple
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tickets:', error)
      throw new Error(`Error al obtener tickets: ${error.message}`)
    }

    return data || []
  }

  static async getById(id: string): Promise<TicketWithRelations | null> {
    try {
      // Primero intentar una consulta simple
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching ticket:', error)
        throw new Error(`Error fetching ticket: ${error.message}`)
      }

      // Si la consulta simple funciona, devolver los datos básicos
      return {
        ...data,
        client: null,
        created_user: null,
        assigned_user: null,
        comments: []
      } as TicketWithRelations

    } catch (err) {
      console.error('Error in getById:', err)
      throw new Error(`Error fetching ticket: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  static async create(ticket: TicketInsert): Promise<TicketWithRelations> {
    const { data, error } = await supabase
      .from('tickets')
      .insert(ticket)
      .select('*')
      .single()

    if (error) {
      console.error('Error creating ticket:', error)
      throw new Error(`Error al crear ticket: ${error.message}`)
    }

    return data
  }

  static async update(id: string, updates: TicketUpdate): Promise<TicketWithRelations> {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating ticket:', error)
      throw new Error(`Error al actualizar ticket: ${error.message}`)
    }

    return data
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting ticket:', error)
      throw new Error(`Error al eliminar ticket: ${error.message}`)
    }
  }

  static async updateStatus(id: string, status: Ticket['status']): Promise<TicketWithRelations> {
    const updates: TicketUpdate = {
      status,
      updated_at: new Date().toISOString()
    }

    // Si se marca como resuelto, agregar timestamp
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString()
    }

    return this.update(id, updates)
  }

  static async getStats() {
    const { data, error } = await supabase
      .from('tickets')
      .select('status, priority, category')

    if (error) {
      console.error('Error fetching ticket stats:', error)
      // En caso de error, devolvemos stats vacías en lugar de lanzar error
      return {
        total: 0,
        open: 0,
        in_progress: 0,
        pending: 0,
        resolved: 0,
        closed: 0,
        by_priority: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        by_category: {
          hardware: 0,
          software: 0,
          network: 0,
          access: 0,
          other: 0,
        }
      }
    }

    const tickets = data || []

    const stats = {
      total: tickets.length,
      open: tickets.filter((t: any) => t.status === 'open').length,
      in_progress: tickets.filter((t: any) => t.status === 'in_progress').length,
      pending: tickets.filter((t: any) => t.status === 'pending').length,
      resolved: tickets.filter((t: any) => t.status === 'resolved').length,
      closed: tickets.filter((t: any) => t.status === 'closed').length,
      by_priority: {
        critical: tickets.filter((t: any) => t.priority === 'critical').length,
        high: tickets.filter((t: any) => t.priority === 'high').length,
        medium: tickets.filter((t: any) => t.priority === 'medium').length,
        low: tickets.filter((t: any) => t.priority === 'low').length,
      },
      by_category: {
        hardware: tickets.filter((t: any) => t.category === 'hardware').length,
        software: tickets.filter((t: any) => t.category === 'software').length,
        network: tickets.filter((t: any) => t.category === 'network').length,
        access: tickets.filter((t: any) => t.category === 'access').length,
        other: tickets.filter((t: any) => t.category === 'other').length,
      }
    }

    return stats
  }
}