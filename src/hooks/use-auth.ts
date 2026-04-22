'use client'

import { useEffect, useState, useCallback, useMemo, useRef, createContext, useContext, createElement, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile, UserRole } from '@/types'
import { clearSupabaseAuthStorage, destroyClientSession } from '@/lib/auth/session-cleanup'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  hasRole: (roles: UserRole[]) => boolean
  isAdmin: () => boolean
  isLeader: () => boolean
  isSupport: () => boolean
  isClient: () => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Cache del perfil en memoria para evitar refetches innecesarios
let profileCache: { [userId: string]: { profile: Profile, timestamp: number } } = {}
// Cache del estado auth para evitar parpadeos y bucles de loading al navegar.
let authStateCache: AuthState = {
  user: null,
  profile: null,
  loading: true,
}
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const buildFallbackProfile = (user: User): Profile => {
  const metadata = user.user_metadata || {}
  const roleFromMeta = metadata.role as UserRole | undefined
  const firstName = (metadata.first_name as string | undefined) || 'Usuario'
  const lastName = (metadata.last_name as string | undefined) || 'Sin perfil'

  return {
    id: user.id,
    user_id: user.id,
    client_id: metadata.client_id as string | undefined,
    email: user.email || '',
    first_name: firstName,
    last_name: lastName,
    role: roleFromMeta || 'agente_soporte',
    avatar_url: metadata.avatar_url as string | undefined,
    totp_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(authStateCache)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setAndCacheAuthState = useCallback((nextState: AuthState) => {
    authStateCache = nextState
    setAuthState(nextState)
  }, [])

  const getProfile = useCallback(async (user: User): Promise<Profile | null> => {
    try {
      const userId = user.id
      // Verificar caché primero
      const cached = profileCache[userId]
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log('[useAuth] Using cached profile')
        return cached.profile
      }

      console.log('[useAuth] Fetching profile for user:', userId)
      // Reintento corto para absorber fallos transitorios de red en navegador.
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (!error && data) {
          profileCache[userId] = {
            profile: data,
            timestamp: now,
          }
          console.log('[useAuth] Profile fetched successfully:', data?.role)
          return data
        }

        if (attempt === 0) {
          await sleep(250)
          continue
        }

        console.error('[useAuth] Error fetching profile:', error)
      }

      // Fallback defensivo para no bloquear la UI si profiles falla temporalmente.
      return buildFallbackProfile(user)
    } catch (error) {
      console.error('[useAuth] Exception fetching profile:', error)
      return buildFallbackProfile(user)
    }
  }, [supabase])

  useEffect(() => {
    let isMounted = true

    // Timeout de seguridad: si la verificación tarda demasiado, liberar loading sin forzar redirección
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('[useAuth] Loading timeout, forcing non-loading state')
      if (!isMounted) return
      if (!authStateCache.loading) return

      setAndCacheAuthState({
        ...authStateCache,
        loading: false,
      })
    }, 3000)

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
          setAndCacheAuthState({
            user: null,
            profile: null,
            loading: false,
          })
          return
        }
        
        if (session?.user) {
          console.log('[useAuth] Session found, fetching profile...')
          const profile = await getProfile(session.user)
          if (!isMounted) return

          setAndCacheAuthState({
            user: session.user,
            profile,
            loading: false,
          })
        } else {
          console.log('[useAuth] No session found')
          setAndCacheAuthState({
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
        
        setAndCacheAuthState({
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
            const profile = await getProfile(session.user)
            if (!isMounted) return
            setAndCacheAuthState({
              user: session.user,
              profile,
              loading: false,
            })
          } else {
            if (!isMounted) return
            setAndCacheAuthState({
              user: null,
              profile: null,
              loading: false,
            })
            
            // Handle different logout scenarios
            if (event === 'SIGNED_OUT') {
              // Limpiar caché
              profileCache = {}
              clearSupabaseAuthStorage()
              router.replace('/auth/login?logout=1')
            }
          }
        } catch (error) {
          console.error('[useAuth] Error in auth state change:', error)
          if (!isMounted) return
          setAndCacheAuthState({
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
  }, [getProfile, router, setAndCacheAuthState, supabase])

  const signOut = async () => {
    const clearLocalAuthState = () => {
      setAndCacheAuthState({
        user: null,
        profile: null,
        loading: false,
      })
    }

    const redirectToLogin = () => {
      if (typeof window !== 'undefined') {
        // Navegación dura inmediata para evitar rebotes por estado stale en App Router.
        window.location.assign('/auth/login?logout=1')
        return
      }

      router.replace('/auth/login?logout=1')
    }

    try {
      profileCache = {}
      clearLocalAuthState()
      await destroyClientSession(supabase)

      redirectToLogin()
    } catch (error) {
      console.error('[useAuth] Error in signOut:', error)
      // Intentar redirigir de todas formas
      clearLocalAuthState()
      redirectToLogin()
      throw error
    }
  }

  const refresh = async () => {
    console.log('[useAuth] Manual refresh triggered')
    setAndCacheAuthState({
      ...authStateCache,
      loading: true,
    })
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('[useAuth] Error refreshing session:', error)
        setAndCacheAuthState({
          user: null,
          profile: null,
          loading: false,
        })
        return
      }
      
      if (session?.user) {
        const profile = await getProfile(session.user)
        setAndCacheAuthState({
          user: session.user,
          profile,
          loading: false,
        })
      } else {
        setAndCacheAuthState({
          user: null,
          profile: null,
          loading: false,
        })
      }
    } catch (error) {
      console.error('[useAuth] Exception refreshing:', error)
      setAndCacheAuthState({
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

  const value = useMemo<AuthContextValue>(() => ({
    ...authState,
    signOut,
    refresh,
    hasRole,
    isAdmin,
    isLeader,
    isSupport,
    isClient,
  }), [authState, refresh])

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
