'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { SESSION_CONFIG, SESSION_MESSAGES } from '@/lib/session-config'
import { destroyClientSession } from '@/lib/auth/session-cleanup'

interface SessionTimeoutConfig {
  timeoutMinutes?: number
  enabled?: boolean
}

export function useSessionTimeout(config: SessionTimeoutConfig = {}) {
  const {
    timeoutMinutes = SESSION_CONFIG.TIMEOUT_MINUTES,
    enabled = SESSION_CONFIG.ENABLED
  } = config

  const router = useRouter()
  const supabase = createClient()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasTimedOutRef = useRef(false)

  const handleTimeout = useCallback(async () => {
    if (hasTimedOutRef.current) return
    hasTimedOutRef.current = true

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
  }, [supabase, router])

  const resetTimeout = useCallback(() => {
    if (!enabled) return
    hasTimedOutRef.current = false

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      await handleTimeout()
    }, timeoutMinutes * 60 * 1000)
  }, [enabled, timeoutMinutes, handleTimeout])

  const handleLogout = async () => {
    try {
      toast.dismiss()
      await destroyClientSession(supabase)
      router.replace(SESSION_CONFIG.REDIRECT_URLS.TIMEOUT)
    } catch (error) {
      console.error('Error during manual logout:', error)
      toast.dismiss()
      router.replace(SESSION_CONFIG.REDIRECT_URLS.TIMEOUT)
    }
  }

  useEffect(() => {
    if (!enabled) return

    const events = SESSION_CONFIG.ACTIVITY_EVENTS
    const resetOnActivity = () => resetTimeout()

    events.forEach(event => {
      document.addEventListener(event, resetOnActivity, true)
    })

    resetTimeout()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetOnActivity, true)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      hasTimedOutRef.current = false
    }
  }, [enabled, resetTimeout])

  return {
    resetTimeout,
    forceLogout: handleLogout,
    handleLogout
  }
}