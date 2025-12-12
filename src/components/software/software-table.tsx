'use client'

import { Loader2 } from 'lucide-react'

interface SoftwareLicenseTableProps {
  clientId?: string
  onEdit?: (id: string) => void
}

export function SoftwareLicenseTable({ clientId, onEdit }: SoftwareLicenseTableProps) {
  // TODO: Implementar cuando esté listo el módulo de licencias
  return (
    <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
      <p className="text-muted-foreground">Módulo de licencias en desarrollo</p>
    </div>
  )
}
