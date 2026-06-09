'use client'

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { SESSION_CONFIG, SESSION_MESSAGES } from '@/lib/session-config'
import { destroyClientSession } from '@/lib/auth/session-cleanup'

interface SessionTimeoutConfig {
  timeoutMinutes?: number
  warningMinutes?: number
  enabled?: boolean
}

export function useSessionTimeout(config: SessionTimeoutConfig = {}) {
  const {
    timeoutMinutes = SESSION_CONFIG.TIMEOUT_MINUTES,
    warningMinutes = SESSION_CONFIG.WARNING_MINUTES,
    enabled = SESSION_CONFIG.ENABLED,
  } = config

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasTimedOutRef = useRef(false)

  const [showWarning, setShowWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    logoutTimerRef.current = null
    warningTimerRef.current = null
    countdownIntervalRef.current = null
  }, [])

  const handleTimeout = useCallback(async () => {
    if (hasTimedOutRef.current) return
    hasTimedOutRef.current = true
    clearTimers()
    setShowWarning(false)

    try {
      toast.dismiss()
      await destroyClientSession(supabase)
      toast.error(SESSION_MESSAGES.TIMEOUT_EXPIRED)
      router.replace(SESSION_CONFIG.REDIRECT_URLS.TIMEOUT)
    } catch (error) {
      console.error('Error during timeout logout:', error)
      toast.dismiss()
      router.replace(SESSION_CONFIG.REDIRECT_URLS.TIMEOUT)
    }
  }, [supabase, router, clearTimers])

  const handleLogout = useCallback(async () => {
    clearTimers()
    setShowWarning(false)

    try {
      toast.dismiss()
      await destroyClientSession(supabase)
      router.replace(SESSION_CONFIG.REDIRECT_URLS.TIMEOUT)
    } catch (error) {
      console.error('Error during manual logout:', error)
      toast.dismiss()
      router.replace(SESSION_CONFIG.REDIRECT_URLS.TIMEOUT)
    }
  }, [supabase, router, clearTimers])

  const scheduleTimers = useCallback(() => {
    if (!enabled) return

    hasTimedOutRef.current = false
    setShowWarning(false)
    clearTimers()

    const totalMs = timeoutMinutes * 60 * 1000
    const warningMs = warningMinutes * 60 * 1000
    const warningLeadMs = totalMs - warningMs

    if (warningMinutes > 0 && warningLeadMs > 0) {
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true)
        setRemainingSeconds(warningMinutes * 60)

        countdownIntervalRef.current = setInterval(() => {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current)
                countdownIntervalRef.current = null
              }
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }, warningLeadMs)
    }

    logoutTimerRef.current = setTimeout(() => {
      void handleTimeout()
    }, totalMs)
  }, [enabled, timeoutMinutes, warningMinutes, clearTimers, handleTimeout])

  const debouncedSchedule = useCallback(() => {
    if (!enabled) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      scheduleTimers()
    }, SESSION_CONFIG.ACTIVITY_DEBOUNCE_MS)
  }, [enabled, scheduleTimers])

  const extendSession = useCallback(() => {
    scheduleTimers()
  }, [scheduleTimers])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      setShowWarning(false)
      return
    }

    const onActivity = () => debouncedSchedule()

    SESSION_CONFIG.ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, onActivity, true)
    })

    window.addEventListener(SESSION_CONFIG.ACTIVITY_EVENT, onActivity)

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      scheduleTimers()
      void supabase.auth.getSession()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    scheduleTimers()

    return () => {
      SESSION_CONFIG.ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, onActivity, true)
      })
      window.removeEventListener(SESSION_CONFIG.ACTIVITY_EVENT, onActivity)
      document.removeEventListener('visibilitychange', onVisibilityChange)

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      clearTimers()
      hasTimedOutRef.current = false
    }
  }, [enabled, scheduleTimers, debouncedSchedule, clearTimers, supabase])

  return {
    resetTimeout: scheduleTimers,
    extendSession,
    forceLogout: handleLogout,
    handleLogout,
    showWarning,
    remainingSeconds,
  }
}
