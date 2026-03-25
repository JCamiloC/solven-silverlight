'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionTimeoutContext } from '@/components/providers/session-timeout-provider'
import { Clock, LogOut } from 'lucide-react'

export function SessionTestControls() {
  const { resetTimeout, forceLogout } = useSessionTimeoutContext()

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
          onClick={resetTimeout}
          variant="secondary"
          className="w-full"
        >
          <Clock className="h-4 w-4 mr-2" />
          Resetear Timer
        </Button>
        
        <Button 
          onClick={forceLogout}
          variant="destructive"
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Forzar Cierre de Sesión
        </Button>
      </CardContent>
    </Card>
  )
}