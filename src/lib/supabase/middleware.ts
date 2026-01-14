import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
      setTimeout(() => reject(new Error('Middleware timeout')), 5000)
    )
    
    const { data: { user }, error } = await Promise.race([
      getUserPromise,
      timeoutPromise
    ]) as any
    
    // Si hay error de autenticación y estamos en una ruta protegida, redirigir
    if (error && request.nextUrl.pathname.startsWith('/dashboard')) {
      console.log('[Middleware] Auth error, redirecting to login:', error.message)
      const redirectUrl = new URL('/auth/login?reason=expired', request.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Si no hay usuario y estamos en ruta protegida, redirigir
    if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
      console.log('[Middleware] No user found, redirecting to login')
      const redirectUrl = new URL('/auth/login', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (error) {
    console.error('[Middleware] Error in session validation:', error)
    
    // Si hay timeout y es ruta protegida, redirigir
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      const redirectUrl = new URL('/auth/login?reason=expired', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}