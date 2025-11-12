'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionTimeoutContext } from '@/components/providers/session-timeout-provider'
import { Clock, AlertTriangle, RefreshCw } from 'lucide-react'

export function SessionTestControls() {
  const { triggerWarningManually, extendSession, resetTimeout } = useSessionTimeoutContext()

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Session Testing
        </CardTitle>
        <CardDescription>
          Controles para probar el sistema de timeout de sesión
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={triggerWarningManually}
          variant="outline"
          className="w-full"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Simular Aviso de Expiración
        </Button>
        
        <Button 
          onClick={extendSession}
          variant="default"
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Extender Sesión
        </Button>
        
        <Button 
          onClick={resetTimeout}
          variant="secondary"
          className="w-full"
        >
          <Clock className="h-4 w-4 mr-2" />
          Resetear Timer
        </Button>
      </CardContent>
    </Card>
  )
}