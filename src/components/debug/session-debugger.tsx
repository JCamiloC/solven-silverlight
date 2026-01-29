'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle2, XCircle, Clock, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface SessionStatus {
  isConnected: boolean
  hasSession: boolean
  tokenExpiresIn: number | null
  lastRefresh: Date | null
  autoRefreshEnabled: boolean
}

/**
 * Componente de debugging para monitorear el estado de la sesión en tiempo real
 * Solo usar en desarrollo o para debugging
 */
export function SessionDebugger() {
  const { user, profile, loading } = useAuth()
  const [status, setStatus] = useState<SessionStatus>({
    isConnected: true,
    hasSession: false,
    tokenExpiresIn: null,
    lastRefresh: null,
    autoRefreshEnabled: true,
  })
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Verificar conexión
        const isOnline = navigator.onLine
        
        // Obtener sesión actual
        const { data: { session } } = await supabase.auth.getSession()
        
        // Calcular tiempo hasta expiración
        let expiresIn: number | null = null
        if (session?.expires_at) {
          expiresIn = session.expires_at - Math.floor(Date.now() / 1000)
        }
        
        setStatus({
          isConnected: isOnline,
          hasSession: !!session,
          tokenExpiresIn: expiresIn,
          lastRefresh: session ? new Date() : null,
          autoRefreshEnabled: true,
        })
      } catch (error) {
        console.error('[SessionDebugger] Error checking status:', error)
        setStatus(prev => ({ ...prev, isConnected: false }))
      }
    }

    // Check status inicial
    checkStatus()

    // Check status cada 10 segundos
    const interval = setInterval(checkStatus, 10000)

    // Listener para cambios de conexión
    const handleOnline = () => setStatus(prev => ({ ...prev, isConnected: true }))
    const handleOffline = () => setStatus(prev => ({ ...prev, isConnected: false }))
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [supabase])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      console.log('[SessionDebugger] Manual refresh successful')
      setStatus(prev => ({ 
        ...prev, 
        lastRefresh: new Date(),
        tokenExpiresIn: data.session?.expires_at 
          ? data.session.expires_at - Math.floor(Date.now() / 1000) 
          : null
      }))
    } catch (error) {
      console.error('[SessionDebugger] Manual refresh error:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    if (seconds < 0) return 'Expirado'
    
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  // Mostrar solo si la variable pública está presente y es 'true'.
  // Esto permite ocultar temporalmente el Session Monitor para revisar cambios.
  const showMonitor = process.env.NEXT_PUBLIC_SHOW_SESSION_MONITOR === 'true'
  if (!showMonitor || process.env.NODE_ENV === 'production') return null

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg border-2 z-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Session Monitor</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Estado de la sesión en tiempo real
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3 text-xs">
        {/* Conexión */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Conexión:</span>
          <Badge variant={status.isConnected ? "default" : "destructive"} className="gap-1">
            {status.isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Offline
              </>
            )}
          </Badge>
        </div>

        {/* Estado de Auth */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Auth Loading:</span>
          <Badge variant={loading ? "secondary" : "outline"}>
            {loading ? 'Cargando...' : 'Completo'}
          </Badge>
        </div>

        {/* Usuario */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Usuario:</span>
          <Badge variant={user ? "default" : "destructive"} className="gap-1">
            {user ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Autenticado
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                No auth
              </>
            )}
          </Badge>
        </div>

        {/* Rol */}
        {profile && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rol:</span>
            <Badge variant="secondary">{profile.role}</Badge>
          </div>
        )}

        {/* Sesión */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Sesión:</span>
          <Badge variant={status.hasSession ? "default" : "destructive"} className="gap-1">
            {status.hasSession ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Activa
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Inactiva
              </>
            )}
          </Badge>
        </div>

        {/* Token expira en */}
        {status.tokenExpiresIn !== null && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Token expira:</span>
            <Badge 
              variant={
                status.tokenExpiresIn > 300 ? "default" : 
                status.tokenExpiresIn > 60 ? "secondary" : 
                "destructive"
              }
              className="gap-1"
            >
              <Clock className="h-3 w-3" />
              {formatTime(status.tokenExpiresIn)}
            </Badge>
          </div>
        )}

        {/* Último refresh */}
        {status.lastRefresh && (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Último refresh:</span>
            <span className="text-xs text-muted-foreground/80">
              {status.lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Email del usuario */}
        {user?.email && (
          <div className="flex flex-col gap-1 pt-2 border-t">
            <span className="text-muted-foreground">Email:</span>
            <span className="text-xs text-muted-foreground/80 truncate">
              {user.email}
            </span>
          </div>
        )}

        {/* Warning si token está por expirar */}
        {status.tokenExpiresIn && status.tokenExpiresIn < 300 && status.tokenExpiresIn > 0 && (
          <div className="p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ Token expirando pronto. Auto-refresh activo.
            </p>
          </div>
        )}

        {/* Error si token expirado */}
        {status.tokenExpiresIn && status.tokenExpiresIn < 0 && (
          <div className="p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-xs text-red-800 dark:text-red-200">
              ❌ Token expirado. Refresca la página.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
