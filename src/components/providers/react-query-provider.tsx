'use client'

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  ensureSessionBeforeMutation,
  SESSION_EXPIRED_MUTATION_MSG,
} from '@/lib/auth/mutation-session-guard'
import { isAbortLikeError } from '@/lib/query-errors'

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const showDevtools =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_SHOW_REACT_QUERY_DEVTOOLS === 'true'

  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onMutate: async (_variables, mutation) => {
            if (mutation.meta?.skipSessionRefresh) return
            try {
              const ok = await ensureSessionBeforeMutation()
              if (!ok) {
                toast.error(SESSION_EXPIRED_MUTATION_MSG)
                throw new Error(SESSION_EXPIRED_MUTATION_MSG)
              }
            } catch (error) {
              if (
                error instanceof Error &&
                error.message.includes('verificación de sesión')
              ) {
                toast.error(error.message)
              }
              throw error
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            // Retry logic mejorado
            retry: (failureCount, error) => {
              if (error && typeof error === 'object' && 'status' in error) {
                const status = (error as { status?: number }).status
                if (status === 401 || status === 403) {
                  return false
                }
              }

              // Abort/timeout: un reintento corto, no un bucle de loading
              if (isAbortLikeError(error)) {
                return failureCount < 1
              }
              
              if (error instanceof Error && 
                  (error.message.includes('sesión') || 
                   error.message.includes('session') ||
                   error.message.includes('JWT'))) {
                return false
              }
              
              return failureCount < 2
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}