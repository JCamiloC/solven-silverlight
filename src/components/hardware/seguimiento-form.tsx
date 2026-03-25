'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { useCreateFollowUp } from '@/hooks/use-hardware'
import { useAuth } from '@/hooks/use-auth'
import { useActionLock } from '@/hooks/use-action-lock'

interface SeguimientoFormProps {
  hardwareId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function SeguimientoForm({ hardwareId, open, onOpenChange, onSaved }: SeguimientoFormProps) {
  const createMutation = useCreateFollowUp()
  const { runWithLock, isLocked } = useActionLock()
  const { profile } = useAuth()
  const [tipo, setTipo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [accionRecomendada, setAccionRecomendada] = useState('')
  const today = format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx")

  const handleSave = async () => {
    try {
      await runWithLock(async () => {
        await createMutation.mutateAsync({
          hardwareId,
          payload: {
            tipo,
            detalle,
            accion_recomendada: accionRecomendada,
            creado_por: profile?.id,
          },
        })
      }, { message: 'Guardando seguimiento...' })
      setTipo('')
      setDetalle('')
      setAccionRecomendada('')
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      console.error('Error creating follow-up', err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Seguimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Fecha de registro</label>
            <Input value={today} readOnly />
          </div>
          <div>
            <label className="text-sm font-medium">Tipo</label>
            <Input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Tipo de seguimiento" />
          </div>
          <div>
            <label className="text-sm font-medium">Detalle</label>
            <Textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} rows={5} />
          </div>
          <div>
            <label className="text-sm font-medium">Acción recomendada</label>
            <Textarea
              value={accionRecomendada}
              onChange={(e) => setAccionRecomendada(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <LoadingButton
              onClick={handleSave}
              loading={createMutation.isPending || isLocked}
              loadingText="Guardando..."
              disabled={!tipo || !detalle || !accionRecomendada}
            >
              Guardar
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
