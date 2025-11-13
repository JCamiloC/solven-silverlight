'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔄 Enviando email de recuperación a:', email)
      console.log('🔗 Redirect URL:', `${window.location.origin}/auth/reset-password`)
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      console.log('📊 Supabase response:', { data, error })

      if (error) {
        throw error
      }

      console.log('✅ Email enviado exitosamente')
      setSuccess(true)
    } catch (err: any) {
      console.error('❌ Error sending reset email:', err)
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        statusCode: err.statusCode
      })
      
      setError(
        err.message === 'User not found' 
          ? 'No encontramos una cuenta con ese email. Verifica el email o contacta al administrador.'
          : `Error al enviar el email de recuperación: ${err.message || 'Inténtalo nuevamente.'}`
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-800">Solven</h1>
            <p className="text-muted-foreground">Sistema de Gestión Integral</p>
          </div>
          
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-green-600">Email Enviado</CardTitle>
              <CardDescription>
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p>Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.</p>
                    <p className="text-sm text-muted-foreground">
                      Si no ves el email, revisa tu carpeta de spam o correo no deseado.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                  className="w-full"
                >
                  Enviar a otro email
                </Button>
                
                <Button 
                  variant="ghost" 
                  asChild
                  className="w-full"
                >
                  <Link href="/auth/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al login
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800">Solven</h1>
          <p className="text-muted-foreground">Sistema de Gestión Integral</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Recuperar Contraseña</CardTitle>
            <CardDescription>
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  disabled={loading}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}