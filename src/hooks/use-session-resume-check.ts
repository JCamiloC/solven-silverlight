'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ensureSessionForSave, validateSessionUsable } from '@/lib/auth/ensure-fresh-session'
import { destroyClientSession } from '@/lib/auth/session-cleanup'
import { SESSION_CONFIG, SESSION_MESSAGES } from '@/lib/session-config'
import { getInFlightSessionRequests } from '@/lib/session-activity'

/** Tras estar ausente (pestaña oculta / sin foco) este tiempo, validar sesión al volver. */
const ABSENCE_BEFORE_CHECK_MS = 10 * 60 * 1000

/**
 * Al volver a la app tras una pausa larga: renueva JWT o redirige a login con aviso claro.
 */
export function useSessionResumeCheck(enabled: boolean) {
  const router = useRouter()
  const hiddenAtRef = useRef<number | null>(null)
  const checkingRef = useRef(false)
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const markHidden = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
      }
    }

    const runResumeCheck = async (reason: string) => {
      if (redirectedRef.current || checkingRef.current) return
      if (document.visibilityState !== 'visible') return

      const hiddenAt = hiddenAtRef.current
      if (hiddenAt === null) return

      const awayMs = Date.now() - hiddenAt
      if (awayMs < ABSENCE_BEFORE_CHECK_MS) {
        hiddenAtRef.current = null
        return
      }

      if (getInFlightSessionRequests() > 0) {
        return
      }

      checkingRef.current = true
      hiddenAtRef.current = null

      try {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[session-resume-check]', reason, `${Math.round(awayMs / 60000)} min away`)
        }

        const renewed = await ensureSessionForSave()
        const usable = renewed || (await validateSessionUsable())

        if (!usable) {
          if (redirectedRef.current) return
          redirectedRef.current = true

          toast.dismiss()
          toast.error(SESSION_MESSAGES.TOKEN_EXPIRED, { duration: 8000 })

          const supabase = createClient()
          await destroyClientSession(supabase)
          router.replace(SESSION_CONFIG.REDIRECT_URLS.EXPIRED)
        }
      } catch (error) {
        console.error('[session-resume-check] Error:', error)
      } finally {
        checkingRef.current = false
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void runResumeCheck('visibility')
      } else {
        markHidden()
      }
    }

    const onBlur = () => {
      hiddenAtRef.current = Date.now()
    }

    const onFocus = () => {
      void runResumeCheck('focus')
    }

    if (document.visibilityState === 'hidden') {
      hiddenAtRef.current = Date.now()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, router])
}
