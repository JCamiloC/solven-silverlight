'use client'

import { useEffect, useState, useCallback, useMemo, useRef, createContext, useContext, createElement, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile, UserRole } from '@/types'
import { clearSupabaseAuthStorage, destroyClientSession } from '@/lib/auth/session-cleanup'
import { isAbortLikeError } from '@/lib/query-errors'
import { ensureFreshSession } from '@/lib/auth/ensure-fresh-session'
import { hasSupabaseAuthCookieHint } from '@/lib/auth/auth-cookie'
import { isAuthRoutePath } from '@/lib/auth/auth-routes'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
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
let inFlightProfile: { [userId: string]: Promise<Profile | null> } = {}
let authStateCache: AuthState = {
  user: null,
  profile: null,
  loading: true,
  initialized: false,
}
const CACHE_DURATION = 5 * 60 * 1000
const AUTH_BOOTSTRAP_TIMEOUT_MS = 15_000

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

function resolveInitialAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return authStateCache
  }

  if (!isAuthRoutePath(window.location.pathname)) {
    return authStateCache
  }

  if (window.location.search.includes('logout=1')) {
    clearSupabaseAuthStorage()
  }

  return {
    user: null,
    profile: null,
    loading: false,
    initialized: true,
  }
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(resolveInitialAuthState)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bootstrappedRef = useRef(authState.initialized)
  const recoveringRef = useRef(false)
  const applyGenRef = useRef(0)

  const setAndCacheAuthState = useCallback((nextState: AuthState) => {
    authStateCache = nextState
    setAuthState(nextState)
  }, [])

  const fetchProfile = useCallback(
    async (user: User): Promise<Profile | null> => {
      try {
        const userId = user.id
        const now = Date.now()

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

  const getProfile = useCallback(
    (user: User): Promise<Profile | null> => {
      const userId = user.id
      const cached = profileCache[userId]

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return Promise.resolve(cached.profile)
      }

      const pending = inFlightProfile[userId]
      if (pending) return pending

      const request = fetchProfile(user).finally(() => {
        delete inFlightProfile[userId]
      })

      inFlightProfile[userId] = request
      return request
    },
    [fetchProfile]
  )

  useEffect(() => {
    let isMounted = true

    loadingTimeoutRef.current = setTimeout(() => {
      if (!isMounted || bootstrappedRef.current) return

      console.warn('[useAuth] Loading timeout, forcing initialized state')
      setAndCacheAuthState({
        ...authStateCache,
        loading: false,
        initialized: true,
      })
      bootstrappedRef.current = true
    }, AUTH_BOOTSTRAP_TIMEOUT_MS)

    const applySession = async (
      sessionUser: User | null,
      options: { refetchProfile?: boolean } = {}
    ) => {
      if (!isMounted) return
      const gen = ++applyGenRef.current
      const refetchProfile = options.refetchProfile ?? true

      if (sessionUser) {
        const sameUser = authStateCache.user?.id === sessionUser.id
        let profile = sameUser ? authStateCache.profile : null

        if (!profile || refetchProfile) {
          profile = await getProfile(sessionUser)
        }

        if (!isMounted || gen !== applyGenRef.current) return

        if (
          sameUser &&
          authStateCache.profile?.id === profile?.id &&
          authStateCache.loading === false &&
          authStateCache.initialized
        ) {
          bootstrappedRef.current = true
          return
        }

        setAndCacheAuthState({
          user: sessionUser,
          profile,
          loading: false,
          initialized: true,
        })
      } else {
        setAndCacheAuthState({
          user: null,
          profile: null,
          loading: false,
          initialized: true,
        })
      }

      bootstrappedRef.current = true
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }

    const recoverSession = async () => {
      recoveringRef.current = true

      try {
        const onAuthPage =
          typeof window !== 'undefined' && isAuthRoutePath(window.location.pathname)

        if (
          onAuthPage &&
          typeof window !== 'undefined' &&
          window.location.search.includes('logout=1')
        ) {
          clearSupabaseAuthStorage()
          await applySession(null)
          return
        }

        if (onAuthPage) {
          // No getSession(): en prod compite con signIn y deja el botón en loader.
          // onAuthStateChange detectará sesión existente y redirige al dashboard.
          setAndCacheAuthState({
            user: null,
            profile: null,
            loading: false,
            initialized: true,
          })
          bootstrappedRef.current = true
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current)
            loadingTimeoutRef.current = null
          }
          return
        }

        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (existingSession?.user) {
          await applySession(existingSession.user)
          return
        }

        const sessionOk = await ensureFreshSession()
        if (!isMounted) return

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (session?.user) {
          await applySession(session.user)
          return
        }

        if (hasSupabaseAuthCookieHint()) {
          const { data: refreshData } = await supabase.auth.refreshSession()
          if (!isMounted) return
          if (refreshData.session?.user) {
            await applySession(refreshData.session.user)
            return
          }
        }

        if (!session?.user && bootstrappedRef.current && authStateCache.user) {
          setAndCacheAuthState({ ...authStateCache, loading: false, initialized: true })
          return
        }

        await applySession(null)
      } catch (error) {
        console.error('[useAuth] Error recovering session:', error)
        if (!isMounted) return

        if (authStateCache.user || isAbortLikeError(error)) {
          setAndCacheAuthState({
            ...authStateCache,
            loading: false,
            initialized: true,
          })
          bootstrappedRef.current = true
          return
        }

        await applySession(null)
      } finally {
        recoveringRef.current = false
      }
    }

    void recoverSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Solo en el arranque, antes de decidir. Después no re-renderizar ni reabrir el ping-pong.
          if (session?.user && !authStateCache.user && !bootstrappedRef.current) {
            await applySession(session.user, { refetchProfile: true })
          }
          return
        }

        if (session?.user) {
          await applySession(session.user, {
            refetchProfile: event === 'SIGNED_IN' || event === 'INITIAL_SESSION',
          })
          return
        }

        if (event === 'INITIAL_SESSION') {
          // getSession() a veces emite null mientras refresca el JWT vencido.
          // recoverSession es la autoridad del arranque.
          if (!recoveringRef.current && !bootstrappedRef.current) {
            await applySession(null)
          }
          return
        }

        if (event === 'SIGNED_OUT') {
          if (recoveringRef.current) return

          profileCache = {}
          inFlightProfile = {}
          clearSupabaseAuthStorage()
          await applySession(null)

          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
            router.replace('/auth/login?logout=1')
          }
          return
        }

        // No borrar sesión por eventos transitorios con session null (refresh en curso).
        return
      } catch (error) {
        console.error('[useAuth] Error in auth state change:', error)
      }
    })

    return () => {
      isMounted = false
      recoveringRef.current = false
      subscription.unsubscribe()
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [getProfile, router, setAndCacheAuthState, supabase])

  const signOut = useCallback(async () => {
    const clearLocalAuthState = () => {
      setAndCacheAuthState({
        user: null,
        profile: null,
        loading: false,
        initialized: true,
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
      inFlightProfile = {}
      clearLocalAuthState()
      await destroyClientSession(supabase)
      redirectToLogin()
    } catch (error) {
      console.error('[useAuth] Error in signOut:', error)
      clearLocalAuthState()
      redirectToLogin()
      throw error
    }
  }, [router, setAndCacheAuthState, supabase])

  const refresh = useCallback(async () => {
    try {
      let {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (!session?.user && hasSupabaseAuthCookieHint()) {
        await ensureFreshSession()
        const retry = await supabase.auth.getSession()
        session = retry.data.session
        error = retry.error
      }

      if (error) {
        setAndCacheAuthState({
          ...authStateCache,
          loading: false,
          initialized: true,
        })
        return
      }

      if (session?.user) {
        const profile = await getProfile(session.user)
        setAndCacheAuthState({
          user: session.user,
          profile,
          loading: false,
          initialized: true,
        })
      } else if (!authStateCache.user) {
        setAndCacheAuthState({
          user: null,
          profile: null,
          loading: false,
          initialized: true,
        })
      } else {
        setAndCacheAuthState({
          ...authStateCache,
          loading: false,
          initialized: true,
        })
      }
    } catch (error) {
      console.error('[useAuth] Exception refreshing:', error)
      setAndCacheAuthState({
        ...authStateCache,
        loading: false,
        initialized: true,
      })
    }
  }, [getProfile, setAndCacheAuthState, supabase])

  // Pestaña en segundo plano: Chrome pausa el autoRefresh. Al volver, renovar JWT.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (authState.user) {
        void ensureFreshSession()
      } else if (hasSupabaseAuthCookieHint()) {
        void refresh()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [authState.user, refresh])

  const hasRole = useCallback((roles: UserRole[]): boolean => {
    if (!authState.profile) return false
    return roles.includes(authState.profile.role)
  }, [authState.profile])

  const isAdmin = useCallback(() => hasRole(['administrador']), [hasRole])
  const isLeader = useCallback(() => hasRole(['administrador', 'lider_soporte']), [hasRole])
  const isSupport = useCallback(
    () => hasRole(['administrador', 'lider_soporte', 'agente_soporte']),
    [hasRole]
  )
  const isClient = useCallback(() => hasRole(['cliente']), [hasRole])

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
    [authState, signOut, refresh, hasRole, isAdmin, isLeader, isSupport, isClient]
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
