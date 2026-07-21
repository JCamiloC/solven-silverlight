import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const MIDDLEWARE_AUTH_TIMEOUT_MS = 25000

function isDefinitiveAuthError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('jwt expired') ||
    normalized.includes('invalid jwt') ||
    normalized.includes('invalid claim') ||
    normalized.includes('refresh token not found') ||
    normalized.includes('invalid refresh token') ||
    normalized.includes('session missing') ||
    normalized.includes('session not found') ||
    normalized.includes('user not found')
  )
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && name.includes('auth-token'))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    // getSession refresca/propaga cookies; getUser valida contra Auth API.
    const getSessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Middleware timeout')), MIDDLEWARE_AUTH_TIMEOUT_MS)
    )

    const {
      data: { session },
      error: sessionError,
    } = await Promise.race([getSessionPromise, timeoutPromise])

    if (sessionError && isProtectedRoute && isDefinitiveAuthError(sessionError.message)) {
      console.log('[Middleware] Definitive session error:', sessionError.message)
      const redirectUrl = new URL('/auth/login?reason=expired', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    let user = session?.user ?? null

    // Validar usuario solo si hay sesión local (evita falsos negativos por red)
    if (user) {
      try {
        const {
          data: { user: verifiedUser },
          error: userError,
        } = await Promise.race([
          supabase.auth.getUser(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Middleware timeout')), MIDDLEWARE_AUTH_TIMEOUT_MS)
          ),
        ])

        if (userError && isDefinitiveAuthError(userError.message)) {
          console.log('[Middleware] Definitive user error:', userError.message)
          if (isProtectedRoute) {
            const redirectUrl = new URL('/auth/login?reason=expired', request.url)
            return NextResponse.redirect(redirectUrl)
          }
        } else if (verifiedUser) {
          user = verifiedUser
        }
        // Errores transitorios: mantener user de session
      } catch (verifyError) {
        const message = verifyError instanceof Error ? verifyError.message : String(verifyError)
        if (message === 'Middleware timeout') {
          console.warn('[Middleware] getUser timed out, keeping session user')
        } else {
          console.warn('[Middleware] getUser failed transiently, keeping session user:', message)
        }
      }
    }

    if (!user && isProtectedRoute) {
      if (hasSupabaseAuthCookie(request)) {
        // Cookie presente pero aún no hidratada/resoluble: no expulsar (rompe el bucle login)
        console.warn('[Middleware] Auth cookie present but user unresolved, allowing request')
        return supabaseResponse
      }

      console.log('[Middleware] No user found, redirecting to login')
      const redirectUrl = new URL('/auth/login', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message === 'Middleware timeout') {
      console.warn('[Middleware] Auth validation timed out, allowing request')
      return supabaseResponse
    }

    console.error('[Middleware] Error in session validation:', error)

    // Solo expulsar si NO hay cookie de auth (evitar bucles por fallos transitorios)
    if (isProtectedRoute && !hasSupabaseAuthCookie(request)) {
      const redirectUrl = new URL('/auth/login?reason=expired', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    if (isProtectedRoute) {
      console.warn('[Middleware] Exception with auth cookie present, allowing request')
    }
  }

  return supabaseResponse
}
