'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile, UserRole } from '@/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
}

// Cache del perfil en memoria para evitar refetches innecesarios
let profileCache: { [userId: string]: { profile: Profile, timestamp: number } } = {}
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  })
  const router = useRouter()
  const supabase = createClient()
  const isInitializedRef = useRef(false)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const getProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      // Verificar caché primero
      const cached = profileCache[userId]
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log('[useAuth] Using cached profile')
        return cached.profile
      }

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
      
      // Guardar en caché
      if (data) {
        profileCache[userId] = {
          profile: data,
          timestamp: now
        }
      }
      
      console.log('[useAuth] Profile fetched successfully:', data?.role)
      return data
    } catch (error) {
      console.error('[useAuth] Exception fetching profile:', error)
      return null
    }
  }, [supabase])

  useEffect(() => {
    // Evitar inicialización múltiple
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    // Timeout de seguridad: si después de 10 segundos sigue cargando, forzar estado
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('[useAuth] Loading timeout, forcing non-loading state')
      setAuthState(prev => ({
        ...prev,
        loading: false
      }))
    }, 10000)

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('[useAuth] Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current)
        }
        
        if (error) {
          console.error('[useAuth] Error getting session:', error)
          setAuthState({
            user: null,
            profile: null,
            loading: false,
          })
          return
        }
        
        if (session?.user) {
          console.log('[useAuth] Session found, fetching profile...')
          const profile = await getProfile(session.user.id)
          setAuthState({
            user: session.user,
            profile,
            loading: false,
          })
        } else {
          console.log('[useAuth] No session found')
          setAuthState({
            user: null,
            profile: null,
            loading: false,
          })
        }
      } catch (error) {
        console.error('[useAuth] Error in getInitialSession:', error)
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current)
        }
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
        console.log('[useAuth] Auth event:', event, session ? 'Session exists' : 'No session')
        
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
              // Limpiar caché
              profileCache = {}
              router.push('/auth/login')
            } else if (event === 'TOKEN_REFRESHED' && !session) {
              // Token refresh failed, likely expired
              console.log('[useAuth] Token refresh failed, redirecting to login')
              profileCache = {}
              router.push('/auth/login?reason=expired')
            }
          }
        } catch (error) {
          console.error('[useAuth] Error in auth state change:', error)
          setAuthState({
            user: null,
            profile: null,
            loading: false,
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [getProfile, router, supabase.auth])

  const signOut = async () => {
    profileCache = {}
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
