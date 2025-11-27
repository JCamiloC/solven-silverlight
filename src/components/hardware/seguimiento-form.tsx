'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { useCreateFollowUp } from '@/hooks/use-hardware'
import { useAuth } from '@/hooks/use-auth'

interface SeguimientoFormProps {
  hardwareId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function SeguimientoForm({ hardwareId, open, onOpenChange, onSaved }: SeguimientoFormProps) {
  const createMutation = useCreateFollowUp()
  const { profile } = useAuth()
  const [tipo, setTipo] = useState('')
  const [detalle, setDetalle] = useState('')
  const today = format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx")

  const handleSave = async () => {
    try {
      await createMutation.mutateAsync({ hardwareId, payload: { tipo, detalle, creado_por: profile?.id } })
      setTipo('')
      setDetalle('')
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
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || !tipo || !detalle}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
