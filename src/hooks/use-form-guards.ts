'use client'

import { useEffect, useRef } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

/**
 * Hidrata el formulario UNA sola vez por entidad (id).
 * Evita bucles: tras create/update, React Query refetch cambia la referencia
 * del objeto y un useEffect([data]) con form.reset() pisaba el form o
 * reentraba en validación/guardado.
 */
export function useHydrateFormOnce<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  entityId: string | null | undefined,
  buildValues: () => TFieldValues,
  enabled = true
) {
  const hydratedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !entityId) return
    if (hydratedIdRef.current === entityId) return

    hydratedIdRef.current = entityId
    form.reset(buildValues())
    // Solo rehidratar cuando cambia el id (no cuando cambia la referencia del objeto)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, enabled])
}

/**
 * Evita doble submit / reentrada mientras la mutación sigue en curso.
 */
export function useSubmitGuard() {
  const submittingRef = useRef(false)

  const runGuarded = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    if (submittingRef.current) return undefined
    submittingRef.current = true
    try {
      return await action()
    } finally {
      submittingRef.current = false
    }
  }

  return { runGuarded, isSubmittingRef: submittingRef }
}
