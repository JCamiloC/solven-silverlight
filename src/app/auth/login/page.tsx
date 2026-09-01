'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { authService } from '@/services/auth'
import { createClient } from '@/lib/supabase/client'
import { NavigationLoader } from '@/components/ui/navigation-loader'
import { clearSupabaseAuthStorage } from '@/lib/auth/session-cleanup'
import { useAuth } from '@/hooks/use-auth'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

const POST_LOGIN_PATH = '/dashboard'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionMessage, setSessionMessage] = useState('')
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { user, initialized } = useAuth()
  const supabaseConfigured = isSupabaseConfigured()
  const fromLogout = searchParams.get('logout') === '1'

  const shouldRetryWithCleanup = (error: unknown) => {
    if (!(error instanceof Error)) return false
    const message = error.message.toLowerCase()

    return (
      message.includes('refresh token not found') ||
      message.includes('invalid refresh token') ||
      message.includes('invalid jwt') ||
      message.includes('jwt expired') ||
      message.includes('session missing')
    )
  }

  useEffect(() => {
    const reason = searchParams.get('reason')

    if (fromLogout) {
      clearSupabaseAuthStorage()
      void supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      setSessionMessage('Sesión cerrada correctamente. Puedes iniciar sesión nuevamente.')
      return
    }

    if (reason === 'timeout') {
      setSessionMessage('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.')
    } else if (reason === 'expired') {
      setSessionMessage('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
    }
  }, [searchParams, fromLogout, supabase.auth])

  useEffect(() => {
    if (fromLogout) return
    if (!initialized || !user?.id) return
    window.location.replace(POST_LOGIN_PATH)
  }, [initialized, user?.id, fromLogout])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError('')

    const loadingGuard = window.setTimeout(() => {
      setLoading(false)
      setError('El inicio de sesión tardó demasiado. Recarga la página e intenta de nuevo.')
    }, 35_000)

    try {
      if (user?.id) {
        const sameUser = user.email?.toLowerCase() === email.trim().toLowerCase()
        if (sameUser) {
          window.location.replace(POST_LOGIN_PATH)
          return
        }
      }

      clearSupabaseAuthStorage()
      void supabase.auth.signOut({ scope: 'local' }).catch(() => {})

      let signInResult: Awaited<ReturnType<typeof authService.signIn>>

      try {
        signInResult = await authService.signIn(email, password)
      } catch (signInError) {
        if (!shouldRetryWithCleanup(signInError)) {
          throw signInError
        }

        clearSupabaseAuthStorage()
        void supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        signInResult = await authService.signIn(email, password)
      }

      const userId = signInResult.session?.user?.id || signInResult.user?.id
      if (!userId) {
        throw new Error('No se pudo establecer la sesión. Intenta nuevamente.')
      }

      window.location.replace(POST_LOGIN_PATH)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(raw)
      setLoading(false)
    } finally {
      window.clearTimeout(loadingGuard)
    }
  }

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <NavigationLoader />
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (user?.id && !fromLogout) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <NavigationLoader />
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando al sistema...
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
              {!supabaseConfigured && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Supabase no está configurado. Copia <code>.env.local.template</code> a{' '}
                    <code>.env.local</code>, agrega la URL y la anon key del proyecto, y reinicia{' '}
                    <code>npm run dev</code>.
                  </AlertDescription>
                </Alert>
              )}

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
                  autoComplete="email"
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
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !supabaseConfigured}>
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
