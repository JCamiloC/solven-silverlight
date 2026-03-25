'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useSessionTimeout } from '@/hooks/use-session-timeout'

interface SessionTimeoutContextType {
  resetTimeout: () => void
  forceLogout: () => void
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined)

interface SessionTimeoutProviderProps {
  children: ReactNode
  timeoutMinutes?: number
  enabled?: boolean
}

export function SessionTimeoutProvider({ 
  children, 
  timeoutMinutes = 5,
  enabled = true
}: SessionTimeoutProviderProps) {
  const { user } = useAuth()
  
  const { 
    resetTimeout,
    forceLogout
  } = useSessionTimeout({ 
    timeoutMinutes, 
    enabled: enabled && !!user // Solo activo si hay usuario logueado
  })

  return (
    <SessionTimeoutContext.Provider value={{ resetTimeout, forceLogout }}>
      {children}
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