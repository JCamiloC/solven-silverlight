'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { SESSION_CONFIG, SESSION_MESSAGES } from '@/lib/session-config'

interface SessionTimeoutConfig {
  timeoutMinutes?: number
  warningMinutes?: number
  enabled?: boolean
}

export function useSessionTimeout(config: SessionTimeoutConfig = {}) {
  const {
    timeoutMinutes = SESSION_CONFIG.TIMEOUT_MINUTES,
    warningMinutes = SESSION_CONFIG.WARNING_MINUTES,
    enabled = SESSION_CONFIG.ENABLED
  } = config

  const router = useRouter()
  const supabase = createClient()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  const handleTimeout = useCallback(async () => {
    try {
      setShowWarning(false) // Cerrar modal antes del logout
      toast.dismiss() // Cancelar todos los toasts activos
      await supabase.auth.signOut()
      toast.error(SESSION_MESSAGES.TIMEOUT_EXPIRED)
      router.push(SESSION_CONFIG.REDIRECT_URLS.TIMEOUT)
    } catch (error) {
      console.error('Error during timeout logout:', error)
      setShowWarning(false) // Cerrar modal incluso si hay error
      toast.dismiss() // Cancelar toasts incluso si hay error
      router.push(SESSION_CONFIG.REDIRECT_URLS.TIMEOUT)
    }
  }, [supabase.auth, router])

  const resetTimeout = useCallback(() => {
    if (!enabled) return

    // Limpiar timeouts existentes
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)

    // Configurar advertencia
    const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000
    warningRef.current = setTimeout(() => {
      setShowWarning(true)
      setRemainingTime(warningMinutes * 60)
      
      toast.warning(
        SESSION_MESSAGES.TIMEOUT_WARNING(warningMinutes),
        {
          duration: warningMinutes * 60 * 1000,
          action: {
            label: 'Extender sesión',
            onClick: () => {
              setShowWarning(false)
              resetTimeout()
              toast.success(SESSION_MESSAGES.SESSION_EXTENDED)
            }
          }
        }
      )
    }, warningTime)

    // Configurar logout automático
    timeoutRef.current = setTimeout(async () => {
      await handleTimeout()
    }, timeoutMinutes * 60 * 1000)
  }, [enabled, timeoutMinutes, warningMinutes, handleTimeout])

  const triggerWarningManually = () => {
    setShowWarning(true)
    setRemainingTime(warningMinutes * 60)
  }


  const handleLogout = async () => {
    try {
      setShowWarning(false) // Cerrar modal antes del logout
      toast.dismiss() // Cancelar todos los toasts activos
      await supabase.auth.signOut()
      router.push(SESSION_CONFIG.REDIRECT_URLS.TIMEOUT)
    } catch (error) {
      console.error('Error during manual logout:', error)
      setShowWarning(false) // Cerrar modal incluso si hay error
      toast.dismiss() // Cancelar toasts incluso si hay error
      router.push(SESSION_CONFIG.REDIRECT_URLS.TIMEOUT)
    }
  }

  const extendSession = () => {
    setShowWarning(false)
    resetTimeout()
    toast.success(SESSION_MESSAGES.SESSION_EXTENDED)
  }

  useEffect(() => {
    if (!enabled) return

    // Eventos que resetean el timeout
    const events = SESSION_CONFIG.ACTIVITY_EVENTS

    const resetOnActivity = () => resetTimeout()

    // Agregar listeners
    events.forEach(event => {
      document.addEventListener(event, resetOnActivity, true)
    })

    // Inicializar timeout
    resetTimeout()

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, resetOnActivity, true)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
    }
  }, [enabled, resetTimeout])

  // Efecto separado para el countdown del warning
  useEffect(() => {
    if (!showWarning) return

    const countdownInterval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          // Ejecutar logout después del render usando setTimeout
          setTimeout(() => {
            handleTimeout()
          }, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [showWarning, handleTimeout])

  return {
    showWarning,
    remainingTime,
    extendSession,
    resetTimeout,
    triggerWarningManually,
    handleLogout
  }
}