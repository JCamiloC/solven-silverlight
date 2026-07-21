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

let profileCache: { [userId: string]: { profile: Profile; timestamp: number } } = {}
let authStateCache: AuthState = {
  user: null,
  profile: null,
  loading: true,
}
const CACHE_DURATION = 5 * 60 * 1000
const AUTH_BOOTSTRAP_TIMEOUT_MS = 12000

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
  const bootstrappedRef = useRef(false)

  const setAndCacheAuthState = useCallback((nextState: AuthState) => {
    authStateCache = nextState
    setAuthState(nextState)
  }, [])

  const getProfile = useCallback(
    async (user: User): Promise<Profile | null> => {
      try {
        const userId = user.id
        const cached = profileCache[userId]
        const now = Date.now()

        if (cached && now - cached.timestamp < CACHE_DURATION) {
          return cached.profile
        }

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
            return data
          }

          if (attempt === 0) {
            await sleep(250)
            continue
          }

          console.error('[useAuth] Error fetching profile:', error)
        }

        return buildFallbackProfile(user)
      } catch (error) {
        console.error('[useAuth] Exception fetching profile:', error)
        return buildFallbackProfile(user)
      }
    },
    [supabase]
  )

  useEffect(() => {
    let isMounted = true

    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('[useAuth] Loading timeout, forcing non-loading state')
      if (!isMounted) return
      if (!authStateCache.loading) return

      // No borrar user si ya hay sesión parcial; solo liberar loading
      setAndCacheAuthState({
        ...authStateCache,
        loading: false,
      })
      bootstrappedRef.current = true
    }, AUTH_BOOTSTRAP_TIMEOUT_MS)

    const applySession = async (sessionUser: User | null) => {
      if (!isMounted) return

      if (sessionUser) {
        const profile = await getProfile(sessionUser)
        if (!isMounted) return
        setAndCacheAuthState({
          user: sessionUser,
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

      bootstrappedRef.current = true
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }

    const getInitialSession = async () => {
      try {
        console.log('[useAuth] Getting initial session...')

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (error) {
          console.error('[useAuth] Error getting session:', error)
          // No limpiar sesión existente por error transitorio si ya había user
          if (!authStateCache.user) {
            await applySession(null)
          } else {
            setAndCacheAuthState({ ...authStateCache, loading: false })
            bootstrappedRef.current = true
          }
          return
        }

        // Si onAuthStateChange ya aplicó la sesión, no sobrescribir con null
        if (!session?.user && bootstrappedRef.current && authStateCache.user) {
          setAndCacheAuthState({ ...authStateCache, loading: false })
          return
        }

        await applySession(session?.user ?? null)
      } catch (error) {
        console.error('[useAuth] Error in getInitialSession:', error)
        if (!isMounted) return

        // Errores de red: no expulsar si ya hay user en cache
        if (authStateCache.user) {
          setAndCacheAuthState({ ...authStateCache, loading: false })
          bootstrappedRef.current = true
          return
        }

        await applySession(null)
      }
    }

    getInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] Auth event:', event, session ? 'Session exists' : 'No session')

      try {
        if (session?.user) {
          await applySession(session.user)
          return
        }

        // INITIAL_SESSION sin sesión: normal en primera carga sin cookies.
        // TOKEN_REFRESHED/USER_UPDATED sin sesión no deben forzar logout inmediato.
        if (event === 'INITIAL_SESSION') {
          if (!bootstrappedRef.current) {
            await applySession(null)
          }
          return
        }

        if (event === 'SIGNED_OUT') {
          profileCache = {}
          clearSupabaseAuthStorage()
          await applySession(null)

          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
            router.replace('/auth/login?logout=1')
          }
          return
        }

        // Otros eventos sin sesión: no borrar user activo (evita bounce post-login)
        if (authStateCache.user && bootstrappedRef.current) {
          console.warn('[useAuth] Ignoring empty session for event:', event)
          return
        }

        await applySession(null)
      } catch (error) {
        console.error('[useAuth] Error in auth state change:', error)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [getProfile, router, setAndCacheAuthState, supabase])

  // Renovar JWT antes de expirar y al volver a la pestaña
  useEffect(() => {
    if (!authState.user) return

    const refreshIfNeeded = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.expires_at) return

        const expiresIn = session.expires_at - Math.floor(Date.now() / 1000)
        if (expiresIn < 10 * 60) {
          await supabase.auth.refreshSession()
        }
      } catch (error) {
        console.warn('[useAuth] Token refresh skipped:', error)
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshIfNeeded()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    const interval = setInterval(() => {
      void refreshIfNeeded()
    }, 50 * 60 * 1000)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(interval)
    }
  }, [authState.user, supabase])

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
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('[useAuth] Error refreshing session:', error)
        setAndCacheAuthState({
          ...authStateCache,
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
        ...authStateCache,
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

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      signOut,
      refresh,
      hasRole,
      isAdmin,
      isLeader,
      isSupport,
      isClient,
    }),
    [authState, refresh]
  )

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
