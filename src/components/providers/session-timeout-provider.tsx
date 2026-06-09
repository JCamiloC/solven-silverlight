'use client'

import { createContext, useContext, ReactNode, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useSessionTimeout } from '@/hooks/use-session-timeout'
import { SessionWarningDialog } from '@/components/auth/session-warning-dialog'
import { getSessionTimeoutMinutes, SESSION_CONFIG } from '@/lib/session-config'

interface SessionTimeoutContextType {
  resetTimeout: () => void
  forceLogout: () => void
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined)

interface SessionTimeoutProviderProps {
  children: ReactNode
  enabled?: boolean
}

export function SessionTimeoutProvider({
  children,
  enabled = true,
}: SessionTimeoutProviderProps) {
  const { user, profile } = useAuth()

  const timeoutMinutes = useMemo(
    () => getSessionTimeoutMinutes(profile?.role),
    [profile?.role]
  )

  const {
    resetTimeout,
    forceLogout,
    extendSession,
    showWarning,
    remainingSeconds,
  } = useSessionTimeout({
    timeoutMinutes,
    warningMinutes: SESSION_CONFIG.WARNING_MINUTES,
    enabled: enabled && !!user,
  })

  return (
    <SessionTimeoutContext.Provider value={{ resetTimeout, forceLogout }}>
      {children}
      <SessionWarningDialog
        isOpen={showWarning}
        remainingTime={remainingSeconds}
        onExtend={extendSession}
        onLogout={forceLogout}
      />
    </SessionTimeoutContext.Provider>
  )
}

export function useSessionTimeoutContext() {
  const context = useContext(SessionTimeoutContext)
  if (!context) {
    throw new Error('useSessionTimeoutContext must be used within SessionTimeoutProvider')
  }
  return context
}
