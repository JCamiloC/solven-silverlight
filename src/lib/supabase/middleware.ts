import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && name.includes('auth-token'))
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/actas') ||
    pathname.startsWith('/_next')
  )
}

/**
 * Una sola responsabilidad: refrescar cookies de sesión.
 * No llama getUser() (ida a Auth API en cada navegación = lentitud en bucle).
 * La validación de rol vive en ProtectedRoute + RLS.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname === '/'

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
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (isProtectedRoute && !session?.user && !hasSupabaseAuthCookie(request)) {
      const redirectUrl = new URL('/auth/login', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (error) {
    console.error('[Middleware] Error refreshing session cookies:', error)

    if (isProtectedRoute && !hasSupabaseAuthCookie(request)) {
      const redirectUrl = new URL('/auth/login', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}
