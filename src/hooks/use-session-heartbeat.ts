'use client'

import { useEffect, useRef } from 'react'
import { ensureFreshSession } from '@/lib/auth/ensure-fresh-session'
import { SESSION_CONFIG } from '@/lib/session-config'

/** Renueva JWT en segundo plano mientras el usuario trabaja en formularios largos. */
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000
/** Tras esta pausa sin eventos DOM, forzar refresh al volver a interactuar. */
const IDLE_BEFORE_ACTIVITY_REFRESH_MS = 2 * 60 * 1000

/**
 * Mantiene alineado el JWT de Supabase con la sesión visible en React.
 * autoRefreshToken falla si el timer del navegador se pausa o hay pausas largas entre campos.
 */
export function useSessionHeartbeat(enabled: boolean) {
  const lastActivityRef = useRef(Date.now())
  const lastHeartbeatRef = useRef(0)
  const runningRef = useRef(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const runHeartbeat = async (reason: string) => {
      if (document.visibilityState !== 'visible') return
      if (runningRef.current) return
      runningRef.current = true
      try {
        await ensureFreshSession()
        lastHeartbeatRef.current = Date.now()
        if (process.env.NODE_ENV === 'development') {
          console.debug('[session-heartbeat]', reason)
        }
      } catch {
        // ensureFreshSession ya maneja timeouts; no bloquear UI
      } finally {
        runningRef.current = false
      }
    }

    const onActivity = () => {
      const now = Date.now()
      const idleMs = now - lastActivityRef.current
      lastActivityRef.current = now

      if (
        idleMs >= IDLE_BEFORE_ACTIVITY_REFRESH_MS &&
        now - lastHeartbeatRef.current >= 30_000
      ) {
        void runHeartbeat('activity-after-idle')
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void runHeartbeat('visibility')
      }
    }

    SESSION_CONFIG.ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, onActivity, true)
    })
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    void runHeartbeat('mount')
    const intervalId = setInterval(() => {
      void runHeartbeat('interval')
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
      SESSION_CONFIG.ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, onActivity, true)
      })
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [enabled])
}
