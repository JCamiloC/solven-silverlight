import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface TicketComment {
  id: string
  ticket_id: string
  comment: string
  created_by: string
  is_internal: boolean
  created_at: string
  updated_at: string
  commenter_name?: string
  commenter_role?: 'cliente' | 'agente_soporte' | 'lider_soporte' | 'administrador'
}

export interface TicketCommentWithUser extends TicketComment {
  user: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface TicketCommentInsert {
  ticket_id: string
  comment: string
  created_by: string
  is_internal?: boolean
  commenter_name?: string
  commenter_role?: 'cliente' | 'agente_soporte' | 'lider_soporte' | 'administrador'
}

export class TicketCommentsService {
  /**
   * Obtiene todos los comentarios de un ticket
   */
  static async getByTicketId(ticketId: string): Promise<TicketCommentWithUser[]> {
    try {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching ticket comments:', error)
        throw new Error(`Error fetching comments: ${error.message}`)
      }

      // Si la consulta funciona, mapear los datos básicos
      return (data || []).map(comment => {
        // Usar commenter_name si existe, sino usar valores por defecto
        const [firstName = 'Usuario', lastName = 'Desconocido'] = (comment.commenter_name || 'Usuario Desconocido').split(' ')
        return {
          ...comment,
          user: {
            id: comment.created_by,
            first_name: firstName,
            last_name: lastName || '',
            email: 'usuario@sistema.com'
          }
        }
      }) as TicketCommentWithUser[]

    } catch (err) {
      console.error('Error in getByTicketId:', err)
      throw new Error(`Error fetching comments: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Crea un nuevo comentario
   */
  static async create(comment: TicketCommentInsert): Promise<TicketCommentWithUser> {
    try {
      const { data, error } = await supabase
        .from('ticket_comments')
        .insert(comment)
        .select('*')
        .single()

      if (error) {
        console.error('Error creating ticket comment:', error)
        throw new Error(`Error creating comment: ${error.message}`)
      }

      // Mapear los datos reales
      return {
        ...data,
        user: {
          id: data.created_by,
          first_name: 'Usuario',
          last_name: 'Actual',
          email: 'usuario@actual.com'
        }
      } as TicketCommentWithUser

    } catch (err) {
      console.error('Error in create comment:', err)
      throw new Error(`Error creating comment: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Actualiza un comentario (solo el autor puede editar)
   */
  static async update(id: string, comment: string, userId: string): Promise<TicketCommentWithUser> {
    const { data, error } = await supabase
      .from('ticket_comments')
      .update({ 
        comment,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('created_by', userId) // Solo el autor puede editar
      .select(`
        *,
        user:profiles!created_by(id, first_name, last_name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      throw new Error(`Error al actualizar comentario: ${error.message}`)
    }

    return data
  }

  /**
   * Elimina un comentario (solo el autor puede eliminar)
   */
  static async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('ticket_comments')
      .delete()
      .eq('id', id)
      .eq('created_by', userId) // Solo el autor puede eliminar

    if (error) {
      console.error('Error deleting comment:', error)
      throw new Error(`Error al eliminar comentario: ${error.message}`)
    }
  }
}