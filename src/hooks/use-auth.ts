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
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setAuthState({
            user: null,
            profile: null,
            loading: false,
          })
          return
        }
        
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
      } catch (error) {
        console.error('Error in getInitialSession:', error)
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
        console.log('Auth event:', event, session ? 'Session exists' : 'No session')
        
        try {
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
            
            // Handle different logout scenarios
            if (event === 'SIGNED_OUT') {
              router.push('/auth/login')
            } else if (event === 'TOKEN_REFRESHED' && !session) {
              // Token refresh failed, likely expired
              console.log('Token refresh failed, redirecting to login')
              router.push('/auth/login?reason=expired')
            }
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
          setAuthState({
            user: null,
            profile: null,
            loading: false,
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const getProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('[useAuth] Fetching profile for user:', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('[useAuth] Error fetching profile:', error)
        return null
      }
      
      console.log('[useAuth] Profile fetched successfully:', data?.role)
      return data
    } catch (error) {
      console.error('[useAuth] Exception fetching profile:', error)
      return null
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const refresh = async () => {
    console.log('[useAuth] Manual refresh triggered')
    setAuthState(prev => ({ ...prev, loading: true }))
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('[useAuth] Error refreshing session:', error)
        setAuthState({
          user: null,
          profile: null,
          loading: false,
        })
        return
      }
      
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
    } catch (error) {
      console.error('[useAuth] Exception refreshing:', error)
      setAuthState({
        user: null,
        profile: null,
        loading: false,
      })
    }
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
    refresh,
    hasRole,
    isAdmin,
    isLeader,
    isSupport,
    isClient,
  }
}