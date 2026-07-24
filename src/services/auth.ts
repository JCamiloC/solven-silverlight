import { createClient } from '@/lib/supabase/client'
import { Profile, UserRole } from '@/types'
import { clearSupabaseAuthStorage } from '@/lib/auth/session-cleanup'

function isAbortOrTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return (
    error.name === 'AbortError' ||
    /aborted|abort|timeout|tardó demasiado/i.test(error.message)
  )
}

function toAuthError(error: unknown): Error {
  if (isAbortOrTimeoutError(error)) {
    return new Error(
      'La autenticación tardó demasiado. Revisa tu conexión e intenta de nuevo.'
    )
  }
  if (error instanceof Error) return error
  return new Error('Error de autenticación')
}

export class AuthService {
  private get supabase() {
    return createClient()
  }

  /**
   * Sin Promise.race extra: el fetch del cliente ya aborta auth a 45s.
   * Un segundo timeout más corto (antes 20s) generaba falsos "timeout" con red lenta.
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return data
    } catch (error) {
      throw toAuthError(error)
    }
  }

  async signUp(
    email: string,
    password: string,
    userData: {
      firstName: string
      lastName: string
      role: UserRole
    }
  ) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role,
          },
        },
      })

      if (error) throw error
      return data
    } catch (error) {
      throw toAuthError(error)
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut({ scope: 'global' })
      if (error) throw error
    } finally {
      clearSupabaseAuthStorage()
    }
  }

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser()
    if (error) throw error
    return user
  }

  async getCurrentProfile(): Promise<Profile | null> {
    const user = await this.getCurrentUser()
    if (!user) return null

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) throw error
    return data
  }

  async updateProfile(profileData: Partial<Profile>) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await this.supabase
      .from('profiles')
      .update(profileData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async checkRole(requiredRoles: UserRole[]): Promise<boolean> {
    const profile = await this.getCurrentProfile()
    if (!profile) return false

    return requiredRoles.includes(profile.role)
  }

  onAuthStateChange(callback: (user: any | null) => void) {
    return this.supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null)
    })
  }
}

export const authService = new AuthService()
