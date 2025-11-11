import { createClient } from '@/lib/supabase/client'
import { User, Profile, UserRole } from '@/types'

export class AuthService {
  private supabase = createClient()

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  }

  async signUp(email: string, password: string, userData: {
    firstName: string
    lastName: string
    role: UserRole
  }) {
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
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw error
  }

  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser()
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