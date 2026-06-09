'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components/ui/loading'

/** Redirige rutas globales deprecadas al listado de clientes. */
export function RedirectToClientes() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/clientes')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loading size="lg" text="Redirigiendo a clientes..." />
    </div>
  )
}
