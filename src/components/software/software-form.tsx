'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface SoftwareLicenseFormProps {
  license?: any
  clientId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function SoftwareLicenseForm({
  license,
  clientId,
  onSuccess,
  onCancel,
}: SoftwareLicenseFormProps) {
  // TODO: Implementar cuando esté listo el módulo de licencias
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Formulario de licencias en desarrollo</p>
      </div>
      
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cerrar
          </Button>
        )}
      </div>
    </div>
  )
}
