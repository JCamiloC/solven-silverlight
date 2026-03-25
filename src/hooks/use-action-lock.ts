'use client'

import { useInteractionLock } from '@/components/providers/interaction-lock-provider'

interface ActionLockOptions {
  message?: string
  timeoutMs?: number
}

export function useActionLock() {
  const { withActionLock, lockNavigation, isLocked } = useInteractionLock()

  const runWithLock = async <T,>(
    action: () => Promise<T>,
    options?: ActionLockOptions
  ): Promise<T> => {
    return withActionLock(action, options)
  }

  const runNavigationLock = (
    action: () => void,
    options?: ActionLockOptions
  ) => {
    lockNavigation(options)
    action()
  }

  return {
    isLocked,
    runWithLock,
    runNavigationLock,
  }
}