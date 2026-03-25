'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { authService } from '@/services/auth'
import { createClient } from '@/lib/supabase/client'
import { NavigationLoader } from '@/components/ui/navigation-loader'
import { destroyClientSession } from '@/lib/auth/session-cleanup'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const [sessionMessage, setSessionMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 8000): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Session verification timeout')), timeoutMs)
        }),
      ])
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  const resolveRedirectPath = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('user_id', userId)
      .single()

    if (profile?.role === 'cliente' && profile.client_id) {
      return `/dashboard/clientes/${profile.client_id}`
    }

    return '/dashboard'
  }

  useEffect(() => {
    const reason = searchParams.get('reason')
    if (reason === 'timeout') {
      setSessionMessage('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.')
    } else if (reason === 'expired') {
      setSessionMessage('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
    }
  }, [searchParams])

  useEffect(() => {
    let isMounted = true

    const checkExistingSession = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession())

        if (!isMounted) return

        if (session?.user) {
          await destroyClientSession(supabase, { preferLocal: true, timeoutMs: 3000 })
          if (!isMounted) return
          setSessionMessage('Se detectó una sesión anterior y fue cerrada. Inicia sesión nuevamente.')
        }
      } catch (sessionError) {
        console.error('Error checking existing session:', sessionError)
      } finally {
        if (isMounted) {
          setCheckingSession(false)
        }
      }
    }

    checkExistingSession()

    return () => {
      isMounted = false
    }
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await destroyClientSession(supabase, { preferLocal: true, timeoutMs: 3000 })
      const { user, session } = await authService.signIn(email, password)

      // Priorizar la sesión devuelta por signIn para evitar falsos timeout en getSession.
      let userId: string | undefined = session?.user?.id || user?.id

      if (!userId) {
        const {
          data: { user: currentUser },
        } = await withTimeout(supabase.auth.getUser(), 12000)
        userId = currentUser?.id
      }

      if (!userId) {
        throw new Error('No se pudo establecer la sesión. Intenta nuevamente.')
      }

      const redirectPath = await resolveRedirectPath(userId)
      window.location.assign(redirectPath)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <NavigationLoader />
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando sesión...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <NavigationLoader />
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800">Solven</h1>
          <p className="text-muted-foreground">Sistema de Gestión Integral</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tu email y contraseña para acceder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {sessionMessage && (
                <Alert>
                  <AlertDescription>{sessionMessage}</AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
            
            <div className="mt-4 text-center text-sm space-y-2">
              <div>
                <Link href="/auth/forgot-password" className="text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div>
                ¿No tienes cuenta?{' '}
                <Link href="/auth/register" className="text-primary hover:underline">
                  Registrarse
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}