import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const MIDDLEWARE_AUTH_TIMEOUT_MS = 20000

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
    
    // Modo estricto: cualquier error de auth en ruta protegida redirige a login.
    if (error && isProtectedRoute) {
      console.log('[Middleware] Auth error detected:', error.message)
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

    // Modo estricto: ante excepción en ruta protegida redirigir a login.
    if (isProtectedRoute) {
      const redirectUrl = new URL('/auth/login?reason=expired', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}