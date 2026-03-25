'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

type LockKind = 'action' | 'navigation'

interface LockEntry {
  id: number
  message: string
  kind: LockKind
}

interface LockOptions {
  message?: string
  timeoutMs?: number
}

interface InteractionLockContextValue {
  isLocked: boolean
  message: string
  lockAction: (options?: LockOptions) => number
  lockNavigation: (options?: LockOptions) => number
  unlock: (id: number) => void
  withActionLock: <T>(action: () => Promise<T>, options?: LockOptions) => Promise<T>
}

const DEFAULT_MESSAGE = 'Procesando...'
const DEFAULT_TIMEOUT_MS = 30000

const InteractionLockContext = createContext<InteractionLockContextValue | undefined>(undefined)

export function InteractionLockProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const [locks, setLocks] = useState<LockEntry[]>([])
  const idCounter = useRef(0)
  const timeoutMap = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const clearLockTimer = useCallback((id: number) => {
    const timeout = timeoutMap.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutMap.current.delete(id)
    }
  }, [])

  const unlock = useCallback((id: number) => {
    clearLockTimer(id)
    setLocks((prev) => prev.filter((entry) => entry.id !== id))
  }, [clearLockTimer])

  const createLock = useCallback((kind: LockKind, options?: LockOptions) => {
    const id = ++idCounter.current
    const message = options?.message || DEFAULT_MESSAGE
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

    setLocks((prev) => [...prev, { id, message, kind }])

    const timeout = setTimeout(() => {
      unlock(id)
    }, timeoutMs)

    timeoutMap.current.set(id, timeout)
    return id
  }, [unlock])

  const lockAction = useCallback((options?: LockOptions) => {
    return createLock('action', options)
  }, [createLock])

  const lockNavigation = useCallback((options?: LockOptions) => {
    return createLock('navigation', options)
  }, [createLock])

  const withActionLock = useCallback(async <T,>(action: () => Promise<T>, options?: LockOptions): Promise<T> => {
    const lockId = lockAction(options)
    try {
      return await action()
    } finally {
      unlock(lockId)
    }
  }, [lockAction, unlock])

  useEffect(() => {
    setLocks((prev) => {
      const navigationLocks = prev.filter((entry) => entry.kind === 'navigation')
      if (navigationLocks.length === 0) return prev

      navigationLocks.forEach((entry) => clearLockTimer(entry.id))
      return prev.filter((entry) => entry.kind !== 'navigation')
    })
  }, [pathname, clearLockTimer])

  useEffect(() => {
    return () => {
      timeoutMap.current.forEach((timeout) => clearTimeout(timeout))
      timeoutMap.current.clear()
    }
  }, [])

  const isLocked = locks.length > 0
  const message = locks[locks.length - 1]?.message || DEFAULT_MESSAGE

  const value = useMemo<InteractionLockContextValue>(() => ({
    isLocked,
    message,
    lockAction,
    lockNavigation,
    unlock,
    withActionLock,
  }), [isLocked, message, lockAction, lockNavigation, unlock, withActionLock])

  return (
    <InteractionLockContext.Provider value={value}>
      {children}

      {isLocked && (
        <div className="fixed inset-0 z-[120] bg-black/25 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white rounded-md shadow-lg px-4 py-3 border border-slate-200 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
            <span className="text-sm text-slate-700">{message}</span>
          </div>
        </div>
      )}
    </InteractionLockContext.Provider>
  )
}

export function useInteractionLock() {
  const context = useContext(InteractionLockContext)
  if (!context) {
    throw new Error('useInteractionLock must be used within InteractionLockProvider')
  }
  return context
}