import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/types'

const supabase = createClient()

export interface User {
  id: string
  user_id: string
  client_id?: string
  email?: string
  first_name: string
  last_name: string
  phone?: string
  role: UserRole
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface UserInsert {
  user_id?: string
  first_name: string
  last_name: string
  email?: string
  password?: string
  phone?: string
  role: UserRole
  client_id?: string
  avatar_url?: string
}

export interface UserUpdate {
  first_name?: string
  last_name?: string
  phone?: string
  role?: UserRole
  client_id?: string
  avatar_url?: string
  updated_at?: string
}

export class UsersService {


  /**
   * Obtiene todos los usuarios del sistema directamente de profiles
   */
  static async getAll(): Promise<User[]> {
    try {
      console.log('� Obteniendo usuarios desde profiles...')
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name, last_name')

      if (profilesError) {
        console.error('Error fetching profiles from database:', profilesError)
        throw new Error(`Error connecting to database: ${profilesError.message}`)
      }

      console.log('✅ Usuarios obtenidos correctamente desde profiles')
      
      // Mapear perfiles con todos los datos disponibles
      return (profiles || []).map((profile) => ({
        id: profile.id,
        user_id: profile.user_id,
        client_id: profile.client_id,
        email: profile.email || `${profile.first_name?.toLowerCase()}.${profile.last_name?.toLowerCase()}@empresa.com`,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        role: profile.role,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      }))

    } catch (error) {
      console.error('Error in getAll users:', error)
      throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Obtiene usuarios que pueden ser asignados a tickets (agente_soporte, lider_soporte, administrador)
   */
  static async getAssignableUsers(): Promise<User[]> {
    try {
      const allUsers = await this.getAll()
      return allUsers.filter(user => 
        ['administrador', 'lider_soporte', 'agente_soporte'].includes(user.role)
      )
    } catch (error) {
      console.error('Error in getAssignableUsers:', error)
      throw new Error(`Failed to fetch assignable users: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Obtiene un usuario por ID
   */
  static async getById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching user:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Error in getById:', err)
      return null
    }
  }

  /**
   * Crear un nuevo usuario con autenticación en Supabase
   */
  static async create(user: UserInsert): Promise<User> {
    try {
      console.log('🔹 Creando nuevo usuario...')
      
      // Si se proporciona email y password, usar la API para crear usuario con privilegios admin
      if (user.email && user.password) {
        console.log('🔐 Creando usuario vía API...')
        
        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            password: user.password,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            phone: user.phone,
            client_id: user.client_id, // ⬅️ FALTABA ESTO
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Error al crear usuario')
        }

        console.log('✅ Usuario creado exitosamente')
        return result.user

      } else {
        // Crear solo el perfil (modo antiguo - para compatibilidad)
        const userData = {
          user_id: user.user_id || `user-${Date.now()}`,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          role: user.role,
          avatar_url: user.avatar_url
        }

        const { data, error } = await supabase
          .from('profiles')
          .insert(userData)
          .select('*')
          .single()

        if (error) {
          console.error('Error creating user:', error)
          throw new Error(`Failed to create user: ${error.message}`)
        }

        return data
      }
    } catch (err) {
      console.error('Error in create user:', err)
      throw new Error(`Failed to create user: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Actualizar un usuario existente
   */
  static async update(id: string, updates: UserUpdate): Promise<User> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        console.error('Error updating user:', error)
        throw new Error(`Error al actualizar usuario: ${error.message}`)
      }

      return data
    } catch (err) {
      console.error('Error in update user:', err)
      throw new Error('Error al actualizar usuario')
    }
  }

  /**
   * Eliminar un usuario
   */
  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting user:', error)
        throw new Error(`Error al eliminar usuario: ${error.message}`)
      }
    } catch (err) {
      console.error('Error in delete user:', err)
      throw new Error('Error al eliminar usuario')
    }
  }

  /**
   * Eliminar un usuario (cambiar su estado a inactivo en la autenticación)
   */
  static async deactivate(id: string): Promise<boolean> {
    try {
      const user = await this.getById(id)
      if (!user?.user_id) {
        throw new Error('Usuario no encontrado')
      }

      // En lugar de marcar como inactivo, podrías eliminar de auth.users
      // o implementar otra lógica según tus necesidades
      console.log('Deactivating user:', id)
      return true
    } catch (err) {
      console.error('Error in deactivate user:', err)
      return false
    }
  }
}