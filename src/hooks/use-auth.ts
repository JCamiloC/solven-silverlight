'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile, UserRole } from '@/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const profile = await getProfile(session.user.id)
        setAuthState({
          user: session.user,
          profile,
          loading: false,
        })
      } else {
        setAuthState({
          user: null,
          profile: null,
          loading: false,
        })
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await getProfile(session.user.id)
          setAuthState({
            user: session.user,
            profile,
            loading: false,
          })
        } else {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
          })
          if (event === 'SIGNED_OUT') {
            router.push('/auth/login')
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const getProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const hasRole = (roles: UserRole[]): boolean => {
    if (!authState.profile) return false
    return roles.includes(authState.profile.role)
  }

  const isAdmin = () => hasRole(['administrador'])
  const isLeader = () => hasRole(['administrador', 'lider_soporte'])
  const isSupport = () => hasRole(['administrador', 'lider_soporte', 'agente_soporte'])
  const isClient = () => hasRole(['cliente'])

  return {
    ...authState,
    signOut,
    hasRole,
    isAdmin,
    isLeader,
    isSupport,
    isClient,
  }
}