'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useSessionTimeout } from '@/hooks/use-session-timeout'
import { SessionWarningDialog } from '@/components/auth/session-warning-dialog'

interface SessionTimeoutContextType {
  extendSession: () => void
  resetTimeout: () => void
  triggerWarningManually: () => void
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined)

interface SessionTimeoutProviderProps {
  children: ReactNode
  timeoutMinutes?: number
  warningMinutes?: number
  enabled?: boolean
}

export function SessionTimeoutProvider({ 
  children, 
  timeoutMinutes = 30,
  warningMinutes = 5,
  enabled = true
}: SessionTimeoutProviderProps) {
  const { user } = useAuth()
  
  const { 
    showWarning, 
    remainingTime, 
    extendSession, 
    resetTimeout,
    triggerWarningManually,
    handleLogout
  } = useSessionTimeout({ 
    timeoutMinutes, 
    warningMinutes, 
    enabled: enabled && !!user // Solo activo si hay usuario logueado
  })

  return (
    <SessionTimeoutContext.Provider value={{ extendSession, resetTimeout, triggerWarningManually }}>
      {children}
      
      <SessionWarningDialog
        isOpen={showWarning}
        remainingTime={remainingTime}
        onExtend={extendSession}
        onLogout={handleLogout}
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