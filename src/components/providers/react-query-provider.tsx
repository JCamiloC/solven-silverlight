'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const showDevtools =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_SHOW_REACT_QUERY_DEVTOOLS === 'true'

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            // Timeout para todas las queries
            gcTime: 5 * 60 * 1000, // 5 minutes (antes era cacheTime)
            // Retry logic mejorado
            retry: (failureCount, error) => {
              // No reintentar en errores de autenticación
              if (error && typeof error === 'object' && 'status' in error) {
                const status = (error as { status?: number }).status
                if (status === 401 || status === 403) {
                  return false
                }
              }
              
              // No reintentar si es timeout
              if (error instanceof Error && error.message.includes('timeout')) {
                return false
              }
              
              // No reintentar si es error de sesión expirada
              if (error instanceof Error && 
                  (error.message.includes('sesión') || 
                   error.message.includes('session') ||
                   error.message.includes('JWT'))) {
                return false
              }
              
              return failureCount < 2 // Reducir reintentos de 3 a 2
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