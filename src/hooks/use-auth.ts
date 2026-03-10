'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile, UserRole } from '@/types'
import { toast } from 'sonner'

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
  const supabase = useMemo(() => createClient(), [])
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    let isMounted = true

    // Timeout de seguridad: si la verificación tarda demasiado, liberar loading sin forzar redirección
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('[useAuth] Loading timeout, forcing non-loading state')
      if (!isMounted) return
      setAuthState(prev => {
        if (!prev.loading) return prev
        return {
          ...prev,
          loading: false,
        }
      })
      toast.error('La verificación de sesión está tardando más de lo normal. Intenta recargar la página.')
    }, 15000)

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('[useAuth] Getting initial session...')

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current)
        }

        if (!isMounted) return
        
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
          let resolvedSession = session
          
          // Verificar si el token está próximo a expirar (menos de 5 minutos)
          const expiresAt = session.expires_at
          if (expiresAt) {
            const expiresIn = expiresAt - Math.floor(Date.now() / 1000)
            if (expiresIn < 300) { // Menos de 5 minutos
              console.log('[useAuth] Token expiring soon, refreshing...')
              try {
                const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
                if (refreshedSession) {
                  console.log('[useAuth] Token refreshed successfully')
                  resolvedSession = refreshedSession
                }
              } catch (refreshError) {
                console.error('[useAuth] Error refreshing token:', refreshError)
              }
            }
          }
          
          const profile = await getProfile(resolvedSession.user.id)
          if (!isMounted) return

          setAuthState({
            user: resolvedSession.user,
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

        if (!isMounted) return
        
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
            if (!isMounted) return
            setAuthState({
              user: session.user,
              profile,
              loading: false,
            })
          } else {
            if (!isMounted) return
            setAuthState({
              user: null,
              profile: null,
              loading: false,
            })
            
            // Handle different logout scenarios
            if (event === 'SIGNED_OUT') {
              // Limpiar caché
              profileCache = {}
              router.replace('/auth/login')
            } else if (event === 'TOKEN_REFRESHED' && !session) {
              // Token refresh failed, likely expired
              console.log('[useAuth] Token refresh failed, redirecting to login')
              profileCache = {}
              router.replace('/auth/login?reason=expired')
            }
          }
        } catch (error) {
          console.error('[useAuth] Error in auth state change:', error)
          if (!isMounted) return
          setAuthState({
            user: null,
            profile: null,
            loading: false,
          })
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [getProfile, router, supabase])

  const signOut = async () => {
    try {
      profileCache = {}
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Redirigir explícitamente al login
      router.push('/auth/login')
    } catch (error) {
      console.error('[useAuth] Error in signOut:', error)
      // Intentar redirigir de todas formas
      router.push('/auth/login')
      throw error
    }
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
