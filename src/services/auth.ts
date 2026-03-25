import { createClient } from '@/lib/supabase/client'
import { User, Profile, UserRole } from '@/types'
import { clearSupabaseAuthStorage, destroyClientSession } from '@/lib/auth/session-cleanup'

// Helper para agregar timeout a operaciones de auth
function withAuthTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operación de autenticación timeout. Por favor, verifica tu conexión.')), timeoutMs)
    ),
  ])
}

export class AuthService {
  private supabase = createClient()

  async signIn(email: string, password: string) {
    // Fallback defensivo: destruir cualquier sesión previa antes de autenticar.
    await destroyClientSession(this.supabase, { preferLocal: true, timeoutMs: 3000 })

    const signInPromise = this.supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    const { data, error } = await withAuthTimeout(signInPromise)
    
    if (error) throw error
    return data
  }

  async signUp(email: string, password: string, userData: {
    firstName: string
    lastName: string
    role: UserRole
  }) {
    const signUpPromise = this.supabase.auth.signUp({
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
    
    const { data, error } = await withAuthTimeout(signUpPromise)
    
    if (error) throw error
    return data
  }

  async signOut() {
    try {
      const { error } = await withAuthTimeout(this.supabase.auth.signOut({ scope: 'global' }), 5000)
      if (error) throw error
    } finally {
      clearSupabaseAuthStorage()
    }
  }

  async getCurrentUser() {
    const { data: { user }, error } = await withAuthTimeout(this.supabase.auth.getUser())
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
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null)
    })
  }
}

export const authService = new AuthService()