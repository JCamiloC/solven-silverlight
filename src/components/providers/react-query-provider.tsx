'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
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
            // Handler global de errores
            onError: (error) => {
              console.error('[React Query] Query error:', error)
              
              // Manejar timeout
              if (error instanceof Error && error.message.includes('timeout')) {
                toast.error('La operación está tardando demasiado. Por favor, refresca la página.')
              }
              
              // Manejar sesión expirada
              if (error instanceof Error && 
                  (error.message.includes('JWT') || 
                   error.message.includes('session') ||
                   error.message.toLowerCase().includes('expired'))) {
                toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')
                // Redirigir al login después de 2 segundos
                setTimeout(() => {
                  window.location.href = '/auth/login?reason=expired'
                }, 2000)
              }
            },
          },
          mutations: {
            retry: false,
            // Handler global de errores para mutaciones
            onError: (error) => {
              console.error('[React Query] Mutation error:', error)
              
              if (error instanceof Error && error.message.includes('timeout')) {
                toast.error('La operación está tardando demasiado. Por favor, intenta de nuevo.')
              }
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}