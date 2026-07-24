import { createClient } from '@/lib/supabase/client'

export interface Ticket {
  id: string
  ticket_number: string
  client_id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'pendiente_confirmacion' | 'solucionado'
  category: 'hardware' | 'software' | 'network' | 'access' | 'other'
  assigned_to?: string
  created_by: string
  usuario_afectado?: string
  resolved_at?: string
  tiempo_respuesta?: string
  tiempo_solucion?: string
  created_at: string
  updated_at: string
  // Campos de archivos y relaciones
  contact_email?: string
  attachment_url?: string
  attachment_name?: string
  attachment_size?: number
  hardware_id?: string
  software_id?: string
  software_source?: 'license' | 'custom_app'
  access_credential_id?: string
  // Campos de notificaciones
  has_update?: boolean
  last_update_by?: string
  last_update_type?: 'comment' | 'status_change' | 'assignment'
}

export interface TicketInsert {
  client_id: string
  title: string
  description: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  status?: 'open' | 'pendiente_confirmacion' | 'solucionado'
  category: 'hardware' | 'software' | 'network' | 'access' | 'other'
  assigned_to?: string
  created_by: string
  usuario_afectado?: string
  // Nuevos campos
  contact_email?: string
  attachment_url?: string
  attachment_name?: string
  attachment_size?: number
  hardware_id?: string
  software_id?: string
  software_source?: 'license' | 'custom_app'
  access_credential_id?: string
}

export interface TicketUpdate {
  title?: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  status?: 'open' | 'pendiente_confirmacion' | 'solucionado'
  category?: 'hardware' | 'software' | 'network' | 'access' | 'other'
  assigned_to?: string
  usuario_afectado?: string
  resolved_at?: string
  tiempo_respuesta?: string
  tiempo_solucion?: string
  updated_at?: string
  contact_email?: string
  attachment_url?: string
  attachment_name?: string
  attachment_size?: number
  hardware_id?: string
  software_id?: string
  software_source?: 'license' | 'custom_app'
  access_credential_id?: string
  has_update?: boolean
  last_update_by?: string
  last_update_type?: 'comment' | 'status_change' | 'assignment'
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

/**
 * Columnas usadas en listados/tablas (evita select * y payload innecesario).
 * Debe ser un literal para que supabase-js pueda inferir el tipo del select.
 */
export const TICKET_LIST_COLUMNS =
  'id,ticket_number,client_id,title,description,priority,status,category,assigned_to,created_by,usuario_afectado,resolved_at,tiempo_respuesta,tiempo_solucion,created_at,updated_at,contact_email,attachment_url,attachment_name,attachment_size,hardware_id,software_id,software_source,access_credential_id,has_update,last_update_by,last_update_type' as const

const TICKET_LIST_LIMIT = 500

export class TicketsService {
  static async getAll(): Promise<TicketWithRelations[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('tickets')
      .select(TICKET_LIST_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(TICKET_LIST_LIMIT)

    if (error) {
      console.error('Error fetching tickets:', error)
      throw new Error(`Error al obtener tickets: ${error.message}`)
    }

    return (data || []) as TicketWithRelations[]
  }

  static async getById(id: string): Promise<TicketWithRelations | null> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(TICKET_LIST_COLUMNS)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching ticket:', error)
        throw new Error(`Error fetching ticket: ${error.message}`)
      }

      return {
        ...data,
        client: undefined,
        created_user: undefined,
        assigned_user: undefined,
        comments: [],
      } as TicketWithRelations
    } catch (err) {
      console.error('Error in getById:', err)
      throw new Error(`Error fetching ticket: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  static async create(ticket: TicketInsert): Promise<TicketWithRelations> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('tickets')
      .insert(ticket)
      .select(TICKET_LIST_COLUMNS)
      .single()

    if (error) {
      console.error('Error creating ticket:', error)
      throw new Error(`Error al crear ticket: ${error.message}`)
    }

    return data as TicketWithRelations
  }

  static async update(id: string, updates: TicketUpdate): Promise<TicketWithRelations> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(TICKET_LIST_COLUMNS)
      .single()

    if (error) {
      console.error('Error updating ticket:', error)
      throw new Error(`Error al actualizar ticket: ${error.message}`)
    }

    return data as TicketWithRelations
  }

  static async delete(id: string): Promise<void> {
    const supabase = createClient()
    
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

    return this.update(id, updates)
  }

  static async getStats() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('tickets')
      .select('status, priority, category')

    if (error) {
      console.error('Error fetching ticket stats:', error)
      return {
        total: 0,
        open: 0,
        pendiente_confirmacion: 0,
        solucionado: 0,
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
        },
      }
    }

    const tickets = data || []

    return {
      total: tickets.length,
      open: tickets.filter((t: any) => t.status === 'open' || t.status === 'in_progress').length,
      pendiente_confirmacion: tickets.filter((t: any) => t.status === 'pendiente_confirmacion').length,
      solucionado: tickets.filter(
        (t: any) => t.status === 'solucionado' || t.status === 'resolved' || t.status === 'closed'
      ).length,
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
      },
    }
  }

  /**
   * Marcar la notificación de actualización como leída
   */
  static async markUpdateAsRead(id: string): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase.rpc('mark_ticket_update_as_read', {
      ticket_id_param: id
    })

    if (error) {
      console.error('Error marking update as read:', error)
      throw new Error(`Error marking update as read: ${error.message}`)
    }
  }

  /**
   * Obtener tickets con notificaciones pendientes para el usuario actual
   */
  static async getWithPendingUpdates(): Promise<TicketWithRelations[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('tickets_with_pending_updates')
      .select('*')

    if (error) {
      console.error('Error fetching tickets with pending updates:', error)
      throw new Error(`Error fetching tickets with pending updates: ${error.message}`)
    }

    return data as TicketWithRelations[]
  }
}