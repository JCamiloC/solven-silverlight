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

  // PromiseLike: los query builders de Supabase son thenables, no Promises.
  const withTimeout = async <T,>(promise: PromiseLike<T>, timeoutMs = 8000): Promise<T> => {
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

  // El destino es una optimización, no un requisito: si tarda o falla,
  // /dashboard redirige igual según el rol.
  const resolveRedirectPath = async (userId: string) => {
    try {
      const { data: profile } = await withTimeout(
        supabase.from('profiles').select('role, client_id').eq('user_id', userId).single(),
        4000
      )

      if (profile?.role === 'cliente' && profile.client_id) {
        return `/dashboard/clientes/${profile.client_id}`
      }
    } catch (error) {
      console.warn('[login] No se pudo resolver el destino, usando /dashboard:', error)
    }

    return '/dashboard'
  }

  const isSessionPersisted = async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 4000)

        if (session?.user?.id) return true
      } catch (error) {
        // Inconcluyente: signIn ya devolvió sesión, no bloquear al usuario aquí.
        console.warn('[login] Verificación de sesión no concluyente:', error)
        return true
      }

      // El write de la cookie puede ser asíncrono
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 300))
    }

    return false
  }

  const shouldRetryWithCleanup = (error: unknown) => {
    if (!(error instanceof Error)) return false
    const message = error.message.toLowerCase()

    // Solo errores claros de sesión corrupta — evitar match amplio de "session"/"token"
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
    const fromLogout = searchParams.get('logout') === '1'

    if (fromLogout) {
      setSessionMessage('Sesión cerrada correctamente. Puedes iniciar sesión nuevamente.')
      return
    }

    if (reason === 'timeout') {
      setSessionMessage('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.')
    } else if (reason === 'expired') {
      setSessionMessage('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
    }
  }, [searchParams])

  useEffect(() => {
    let isMounted = true
    const fromLogout = searchParams.get('logout') === '1'

    const checkExistingSession = async () => {
      try {
        if (fromLogout) {
          await destroyClientSession(supabase, { preferLocal: true, timeoutMs: 3000 })
          return
        }

        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession())

        if (!isMounted) return

        if (session?.user) {
          // Preferir session local: getUser es validación remota y no debe
          // bloquear el ingreso si la sesión ya está en el navegador.
          let userId = session.user.id

          try {
            const {
              data: { user: currentUser },
            } = await withTimeout(supabase.auth.getUser(), 8000)
            if (currentUser?.id) {
              userId = currentUser.id
            }
          } catch (verifyError) {
            console.warn(
              '[login] getUser lento/falló; redirigiendo con sesión local:',
              verifyError
            )
          }

          if (!isMounted) return

          if (userId) {
            const redirectPath = await resolveRedirectPath(userId)
            window.location.assign(redirectPath)
            return
          }

          await destroyClientSession(supabase, { preferLocal: true, timeoutMs: 3000 })
          if (!isMounted) return
          setSessionMessage('Se limpió una sesión inválida. Ahora puedes iniciar sesión de nuevo.')
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
  }, [router, searchParams, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let signInResult: Awaited<ReturnType<typeof authService.signIn>>

      try {
        signInResult = await authService.signIn(email, password)
      } catch (signInError) {
        if (!shouldRetryWithCleanup(signInError)) {
          throw signInError
        }

        await destroyClientSession(supabase, { preferLocal: true, timeoutMs: 3000 })
        signInResult = await authService.signIn(email, password)
      }

      const { user, session } = signInResult

      // Única fuente de verdad post-login: lo que devolvió signIn.
      // No llamar getUser/getSession con timeouts cortos aquí: si Auth ya autenticó,
      // un fallo de verificación no debe tumbar el ingreso.
      const userId = session?.user?.id || user?.id
      if (!userId) {
        throw new Error('No se pudo establecer la sesión. Intenta nuevamente.')
      }

      // Best-effort: si confirma cookies, bien; si timeout/error, igual navegamos.
      // El middleware deja pasar si hay cookie o si Auth aún está hidratando.
      void (await isSessionPersisted())

      const redirectPath = await resolveRedirectPath(userId)
      window.location.assign(redirectPath)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Error al iniciar sesión'
      const errorMessage = /timeout|tardó demasiado|aborted|abort/i.test(raw)
        ? 'La autenticación tardó demasiado. Revisa tu conexión e intenta de nuevo.'
        : raw
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