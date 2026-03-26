import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const MIDDLEWARE_AUTH_TIMEOUT_MS = 20000

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'))
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
          cookiesToSet.forEach(({ name, value, options }) => {
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
    // Agregar timeout al getUser para evitar que se quede colgado
    const getUserPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Middleware timeout')), MIDDLEWARE_AUTH_TIMEOUT_MS)
    )
    
    const { data: { user }, error } = await Promise.race([
      getUserPromise,
      timeoutPromise
    ]) as any
    
    // Si hay error de autenticación en ruta protegida:
    // - Con cookie de sesión presente, permitir request para evitar falsos logout por latencia/red.
    // - Sin cookie, redirigir a login.
    if (error && isProtectedRoute) {
      console.log('[Middleware] Auth error detected:', error.message)

      if (hasSupabaseAuthCookie(request)) {
        console.warn('[Middleware] Auth error con cookie presente, permitiendo request')
        return supabaseResponse
      }

      const redirectUrl = new URL('/auth/login?reason=expired', request.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Si no hay usuario y estamos en ruta protegida, redirigir
    if (!user && isProtectedRoute) {
      console.log('[Middleware] No user found, redirecting to login')
      const redirectUrl = new URL('/auth/login', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (error) {
    console.error('[Middleware] Error in session validation:', error)

    // Si hay timeout pero existen cookies de sesión, permitir que la app cliente complete validación
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (isProtectedRoute && message.includes('timeout') && hasSupabaseAuthCookie(request)) {
      console.warn('[Middleware] Timeout detectado con cookies de auth presentes, permitiendo request')
      return supabaseResponse
    }

    // Sin cookies válidas en ruta protegida, redirigir a login
    if (isProtectedRoute) {
      const redirectUrl = new URL('/auth/login?reason=expired', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}