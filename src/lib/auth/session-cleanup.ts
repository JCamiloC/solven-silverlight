import type { SupabaseClient } from '@supabase/supabase-js'

interface DestroySessionOptions {
  preferLocal?: boolean
  timeoutMs?: number
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Sign out timeout')), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

function clearStorageAuthKeys(storage: Storage) {
  const keysToDelete: string[] = []

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key) continue

    if (key.startsWith('sb-') || key.includes('-auth-token')) {
      keysToDelete.push(key)
    }
  }

  keysToDelete.forEach((key) => {
    storage.removeItem(key)
  })
}

export function clearSupabaseAuthStorage() {
  if (typeof window === 'undefined') return

  try {
    clearStorageAuthKeys(window.localStorage)
    clearStorageAuthKeys(window.sessionStorage)
  } catch (error) {
    console.warn('[auth] Unable to clear auth storage keys:', error)
  }
}

export async function destroyClientSession(
  supabase: SupabaseClient,
  options: DestroySessionOptions = {}
) {
  const { preferLocal = false, timeoutMs = 4000 } = options
  const scopes: Array<'global' | 'local'> = preferLocal
    ? ['local', 'global']
    : ['global', 'local']

  try {
    for (const scope of scopes) {
      try {
        await withTimeout(supabase.auth.signOut({ scope }), timeoutMs)
        break
      } catch (error) {
        console.warn(`[auth] ${scope} sign out failed, trying fallback if available:`, error)
      }
    }
  } finally {
    clearSupabaseAuthStorage()
  }
}