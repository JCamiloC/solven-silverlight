'use client'

import { useQuery } from '@tanstack/react-query'
import type { ExpirationAlertsSummary } from '@/lib/alerts/types'

export const expirationAlertKeys = {
  all: ['expiration-alerts'] as const,
}

async function fetchExpirationAlerts(): Promise<ExpirationAlertsSummary> {
  const response = await fetch('/api/alerts/expirations', { credentials: 'include' })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'No se pudieron cargar las alertas')
  }
  return response.json()
}

export function useExpirationAlerts(enabled = true) {
  return useQuery({
    queryKey: expirationAlertKeys.all,
    queryFn: fetchExpirationAlerts,
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}
