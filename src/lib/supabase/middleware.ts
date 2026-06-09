import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const MIDDLEWARE_AUTH_TIMEOUT_MS = 20000

function isDefinitiveAuthError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('jwt expired') ||
    normalized.includes('invalid jwt') ||
    normalized.includes('invalid claim') ||
    normalized.includes('refresh token') ||
    normalized.includes('session missing') ||
    normalized.includes('session not found') ||
    normalized.includes('user not found')
  )
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
    const getUserPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Middleware timeout')), MIDDLEWARE_AUTH_TIMEOUT_MS)
    )

    const { data: { user }, error } = await Promise.race([
      getUserPromise,
      timeoutPromise,
    ])

    if (error && isProtectedRoute) {
      if (isDefinitiveAuthError(error.message)) {
        console.log('[Middleware] Definitive auth error:', error.message)
        const redirectUrl = new URL('/auth/login?reason=expired', request.url)
        return NextResponse.redirect(redirectUrl)
      }

      console.warn('[Middleware] Transient auth error, allowing request:', error.message)
      return supabaseResponse
    }

    if (!user && isProtectedRoute) {
      const hasAuthCookie = request.cookies
        .getAll()
        .some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'))

      if (hasAuthCookie) {
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

    if (isProtectedRoute) {
      const redirectUrl = new URL('/auth/login?reason=expired', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}
