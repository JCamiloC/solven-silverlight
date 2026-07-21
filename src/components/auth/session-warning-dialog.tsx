'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, AlertTriangle } from 'lucide-react'

interface SessionWarningDialogProps {
  isOpen: boolean
  remainingTime: number
  onExtend: () => void
  onLogout: () => void
}

/**
 * Aviso no bloqueante: el usuario puede seguir trabajando.
 * Cualquier actividad o petición alarga la sesión automáticamente.
 */
export function SessionWarningDialog({
  isOpen,
  remainingTime,
  onExtend,
  onLogout,
}: SessionWarningDialogProps) {
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold text-amber-900">Sesión por expirar</p>
          <p className="text-sm text-amber-800">
            Sin actividad se cerrará en{' '}
            <span className="inline-flex items-center gap-1 font-mono font-bold text-red-600">
              <Clock className="h-4 w-4" />
              {formatTime(remainingTime)}
            </span>
            . Seguir trabajando o guardar datos la alarga automáticamente.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={onExtend}>
              Extender sesión
            </Button>
            <Button size="sm" variant="outline" onClick={onLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
