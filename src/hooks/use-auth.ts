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
import { withAsyncTimeout } from '@/lib/auth/session-with-timeout'
import { isAuthRoutePath } from '@/lib/auth/auth-routes'
import { useSessionHeartbeat } from '@/hooks/use-session-heartbeat'
import { buildFallbackProfile } from '@/lib/auth/fallback-profile'

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
const AUTH_BOOTSTRAP_TIMEOUT_MS = 5_000
const GET_SESSION_BOOTSTRAP_MS = 8_000
const REFRESH_SESSION_BOOTSTRAP_MS = 10_000
const PROFILE_FETCH_MS = 10_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
      void (async () => {
        if (!authStateCache.user && hasSupabaseAuthCookieHint()) {
          try {
            const { data: refreshData } = await withAsyncTimeout(
              supabase.auth.refreshSession(),
              REFRESH_SESSION_BOOTSTRAP_MS,
              'refreshSession (timeout fallback)'
            )
            if (refreshData.session?.user && isMounted) {
              await applySession(refreshData.session.user, { refetchProfile: true })
              return
            }
          } catch (error) {
            console.warn('[useAuth] Timeout fallback refresh failed:', error)
          }
        }

        if (!isMounted) return
        const timedUser = authStateCache.user
        setAndCacheAuthState({
          user: timedUser,
          profile:
            authStateCache.profile ??
            (timedUser ? buildFallbackProfile(timedUser) : null),
          loading: false,
          initialized: true,
        })
        bootstrappedRef.current = true
      })()
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

        if (!profile) {
          profile = buildFallbackProfile(sessionUser)
          setAndCacheAuthState({
            user: sessionUser,
            profile,
            loading: true,
            initialized: true,
          })
          bootstrappedRef.current = true
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current)
            loadingTimeoutRef.current = null
          }
        }

        if (!profile || refetchProfile) {
          let fetched: Profile | null = null
          try {
            fetched = await withAsyncTimeout(
              getProfile(sessionUser),
              PROFILE_FETCH_MS,
              'Profile fetch'
            )
          } catch (error) {
            console.warn('[useAuth] Profile fetch skipped:', error)
          }
          profile = fetched ?? profile ?? buildFallbackProfile(sessionUser)
        }

        if (!isMounted || gen !== applyGenRef.current) return

        if (
          sameUser &&
          authStateCache.profile?.id === profile?.id &&
          authStateCache.loading === false &&
          authStateCache.initialized &&
          !refetchProfile
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
          const forceCleanSession =
            typeof window !== 'undefined' &&
            (window.location.search.includes('logout=1') ||
              window.location.search.includes('reason=expired') ||
              window.location.search.includes('reason=timeout'))

          if (forceCleanSession) {
            clearSupabaseAuthStorage()
          }

          // No getSession(): en prod compite con signIn y deja el botón en loader.
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

        if (hasSupabaseAuthCookieHint()) {
          setAndCacheAuthState({
            ...authStateCache,
            loading: true,
            initialized: true,
          })
        }

        let sessionUser: User | null = null

        try {
          const {
            data: { session: existingSession },
          } = await withAsyncTimeout(
            supabase.auth.getSession(),
            GET_SESSION_BOOTSTRAP_MS,
            'getSession'
          )
          sessionUser = existingSession?.user ?? null
        } catch (error) {
          console.warn('[useAuth] getSession slow or failed:', error)
        }

        if (!isMounted) return

        if (sessionUser) {
          await applySession(sessionUser, { refetchProfile: true })
          return
        }

        if (hasSupabaseAuthCookieHint()) {
          try {
            const { data: refreshData } = await withAsyncTimeout(
              supabase.auth.refreshSession(),
              REFRESH_SESSION_BOOTSTRAP_MS,
              'refreshSession'
            )
            if (!isMounted) return
            if (refreshData.session?.user) {
              await applySession(refreshData.session.user, { refetchProfile: true })
              return
            }
          } catch (error) {
            console.warn('[useAuth] refreshSession failed:', error)
          }
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
          if (
            !session?.user &&
            !recoveringRef.current &&
            !bootstrappedRef.current &&
            !hasSupabaseAuthCookieHint()
          ) {
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
      await destroyClientSession(supabase, { preferLocal: true })
      redirectToLogin()
    } catch (error) {
      console.error('[useAuth] Error in signOut:', error)
      clearLocalAuthState()
      redirectToLogin()
      throw error
    }
  }, [router, setAndCacheAuthState, supabase])

  const purgeStaleAuthClientState = useCallback(() => {
    profileCache = {}
    inFlightProfile = {}
    clearSupabaseAuthStorage()
    setAndCacheAuthState({
      user: null,
      profile: null,
      loading: false,
      initialized: true,
    })
  }, [setAndCacheAuthState])

  const refresh = useCallback(async () => {
    const hadCookieHint = hasSupabaseAuthCookieHint()
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
        if (hadCookieHint || hasSupabaseAuthCookieHint()) {
          purgeStaleAuthClientState()
        } else {
          setAndCacheAuthState({
            ...authStateCache,
            loading: false,
            initialized: true,
          })
        }
        return
      }

      if (session?.user) {
        const interim = authStateCache.profile ?? buildFallbackProfile(session.user)
        setAndCacheAuthState({
          user: session.user,
          profile: interim,
          loading: true,
          initialized: true,
        })
        const profile = (await getProfile(session.user)) ?? interim
        setAndCacheAuthState({
          user: session.user,
          profile,
          loading: false,
          initialized: true,
        })
      } else if (hasSupabaseAuthCookieHint()) {
        const { data: refreshData } = await supabase.auth.refreshSession()
        if (refreshData.session?.user) {
          const interim =
            authStateCache.profile ?? buildFallbackProfile(refreshData.session.user)
          setAndCacheAuthState({
            user: refreshData.session.user,
            profile: interim,
            loading: true,
            initialized: true,
          })
          const profile = (await getProfile(refreshData.session.user)) ?? interim
          setAndCacheAuthState({
            user: refreshData.session.user,
            profile,
            loading: false,
            initialized: true,
          })
        } else {
          purgeStaleAuthClientState()
        }
      } else {
        setAndCacheAuthState({
          user: null,
          profile: null,
          loading: false,
          initialized: true,
        })
      }
    } catch (error) {
      console.error('[useAuth] Exception refreshing:', error)
      if (hasSupabaseAuthCookieHint() && !isAbortLikeError(error)) {
        try {
          const { data: refreshData } = await supabase.auth.refreshSession()
          if (refreshData.session?.user) {
            const profile = await getProfile(refreshData.session.user)
            setAndCacheAuthState({
              user: refreshData.session.user,
              profile,
              loading: false,
              initialized: true,
            })
            return
          }
        } catch {
          // fall through to clear
        }
      }
      if (hadCookieHint || hasSupabaseAuthCookieHint()) {
        purgeStaleAuthClientState()
      } else {
        setAndCacheAuthState({
          user: null,
          profile: null,
          loading: false,
          initialized: true,
        })
      }
    }
  }, [getProfile, purgeStaleAuthClientState, setAndCacheAuthState, supabase])

  // Sin user pero con cookie: recuperar sesión al volver a la pestaña (heartbeat cubre user activo).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (!authState.user && hasSupabaseAuthCookieHint()) {
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

  useSessionHeartbeat(Boolean(authState.user))

  useEffect(() => {
    const onSessionRefreshed = () => {
      void refresh()
    }
    window.addEventListener('solven:session-refreshed', onSessionRefreshed)
    return () => window.removeEventListener('solven:session-refreshed', onSessionRefreshed)
  }, [refresh])

  const hasRole = useCallback(
    (roles: UserRole[]): boolean => {
      const effective =
        authState.profile ??
        (authState.user ? buildFallbackProfile(authState.user) : null)
      if (!effective) return false
      return roles.includes(effective.role)
    },
    [authState.profile, authState.user]
  )

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
