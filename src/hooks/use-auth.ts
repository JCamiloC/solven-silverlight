'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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

    // Timeout de seguridad: si después de 8 segundos sigue cargando, forzar estado
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('[useAuth] Loading timeout, forcing non-loading state')
      setAuthState(prev => ({
        ...prev,
        loading: false
      }))
      // Si sigue cargando después de 8s, probablemente hay un problema de sesión
      toast.error('Problema detectado con la sesión. Redirigiendo...')
      setTimeout(() => {
        window.location.href = '/auth/login?reason=timeout'
      }, 1500)
    }, 8000) // Reducido de 10s a 8s

    // Get initial session con timeout
    const getInitialSession = async () => {
      try {
        console.log('[useAuth] Getting initial session...')
        
        // Crear timeout para getSession
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 5000)
        )
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any
        
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
                }
              } catch (refreshError) {
                console.error('[useAuth] Error refreshing token:', refreshError)
              }
            }
          }
          
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
        
        // Si es timeout, mostrar mensaje específico
        if (error instanceof Error && error.message.includes('timeout')) {
          toast.error('La verificación de sesión está tardando demasiado. Por favor, refresca la página.')
        }
        
        setAuthState({
          user: null,
          profile: null,
          loading: false,
        })
      }
    }

    getInitialSession()
    
    // Auto-refresh token cada 4 minutos (antes de que expire)
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('[useAuth] Auto-refreshing token...')
          await supabase.auth.refreshSession()
        }
      } catch (error) {
        console.error('[useAuth] Error in auto-refresh:', error)
      }
    }, 4 * 60 * 1000) // 4 minutos

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
      clearInterval(refreshInterval)
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
