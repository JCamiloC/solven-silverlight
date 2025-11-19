'use client'

import { useCallback } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Clock, AlertTriangle } from 'lucide-react'

interface SessionWarningDialogProps {
  isOpen: boolean
  remainingTime: number
  onExtend: () => void
  onLogout: () => void
}

export function SessionWarningDialog({ 
  isOpen, 
  remainingTime, 
  onExtend, 
  onLogout 
}: SessionWarningDialogProps) {
  
  const handleExtend = useCallback(() => {
    onExtend()
  }, [onExtend])

  const handleLogout = useCallback(() => {
    onLogout()
  }, [onLogout])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  return (
    <AlertDialog open={isOpen} onOpenChange={() => {}}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>Sesión por Expirar</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tu sesión expirará por inactividad en:
              </p>
              <div className="flex items-center justify-center gap-2 text-2xl font-mono font-bold text-red-500">
                <Clock className="h-6 w-6" />
                {formatTime(remainingTime)}
              </div>
              <p className="text-sm text-muted-foreground">
                ¿Deseas extender tu sesión o cerrar sesión ahora?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:space-x-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleExtend}>
              Extender Sesión
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}