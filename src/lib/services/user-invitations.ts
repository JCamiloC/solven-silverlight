import { createClient } from '@supabase/supabase-js'
import { UserRole } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validar que las variables estén configuradas
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}
if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY no configurado - funciones de invitación no disponibles')
}

// Cliente con permisos de servicio para operaciones administrativas
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null

export interface UserInvitation {
  email: string
  first_name: string
  last_name: string
  role: UserRole
  phone?: string
  department?: string
}

export class UserInvitationService {
  /**
   * Invitar un nuevo usuario por email
   * Crea el usuario en auth.users y envía email de invitación
   */
  static async inviteUser(invitation: UserInvitation): Promise<{ success: boolean; message: string; user_id?: string }> {
    if (!supabaseAdmin) {
      return {
        success: false,
        message: 'Service Role Key no configurado. Configura SUPABASE_SERVICE_ROLE_KEY en .env.local'
      }
    }

    try {
      // 1. Crear usuario en Supabase Auth con invitación
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        invitation.email,
        {
          data: {
            first_name: invitation.first_name,
            last_name: invitation.last_name,
            role: invitation.role
          },
          redirectTo: `${window.location.origin}/auth/callback`
        }
      )

      if (authError) {
        console.error('Error creating auth user:', authError)
        return {
          success: false,
          message: `Error al crear usuario: ${authError.message}`
        }
      }

      if (!authData.user) {
        return {
          success: false,
          message: 'No se pudo crear el usuario en el sistema de autenticación'
        }
      }

      // 2. Crear perfil en la tabla profiles
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          phone: invitation.phone,
          department: invitation.department,
          role: invitation.role
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        
        // Si falla la creación del perfil, eliminar el usuario de auth
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        
        return {
          success: false,
          message: `Error al crear perfil de usuario: ${profileError.message}`
        }
      }

      return {
        success: true,
        message: `Invitación enviada exitosamente a ${invitation.email}`,
        user_id: authData.user.id
      }

    } catch (error) {
      console.error('Error in inviteUser:', error)
      return {
        success: false,
        message: 'Error interno del servidor al procesar la invitación'
      }
    }
  }

  /**
   * Reenviar invitación a un usuario existente
   */
  static async resendInvitation(email: string): Promise<{ success: boolean; message: string }> {
    if (!supabaseAdmin) {
      return {
        success: false,
        message: 'Service Role Key no configurado'
      }
    }

    try {
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`
      })

      if (error) {
        return {
          success: false,
          message: `Error al reenviar invitación: ${error.message}`
        }
      }

      return {
        success: true,
        message: `Invitación reenviada exitosamente a ${email}`
      }
    } catch (error) {
      console.error('Error in resendInvitation:', error)
      return {
        success: false,
        message: 'Error interno del servidor al reenviar la invitación'
      }
    }
  }

  /**
   * Obtener usuarios pendientes de confirmar email
   */
  static async getPendingUsers(): Promise<any[]> {
    if (!supabaseAdmin) {
      console.warn('Service Role Key no configurado - no se pueden obtener usuarios pendientes')
      return []
    }

    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers()
      
      if (error) {
        console.error('Error fetching pending users:', error)
        return []
      }

      // Filtrar usuarios que no han confirmado su email
      return data.users.filter(user => !user.email_confirmed_at)
    } catch (error) {
      console.error('Error in getPendingUsers:', error)
      return []
    }
  }
}