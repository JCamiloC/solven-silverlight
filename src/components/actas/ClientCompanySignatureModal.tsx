'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SignaturePad, { SignaturePadHandle } from '@/components/ui/SignaturePad'

type Props = {
  clientId: string
  initialName?: string
  initialCedula?: string
  initialSignatureUrl?: string
  onSaved?: () => void
}

export default function ClientCompanySignatureModal({
  clientId,
  initialName,
  initialCedula,
  initialSignatureUrl,
  onSaved,
}: Props) {
  const sigRef = useRef<SignaturePadHandle | null>(null)

  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState(initialName || '')
  const [cedula, setCedula] = useState(initialCedula || '')
  const [uploading, setUploading] = useState(false)

  const hasRegisteredSignature = Boolean(initialSignatureUrl)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim() || !cedula.trim()) {
      toast.error('Debes completar nombre y cédula')
      return
    }

    const dataUrl = sigRef.current?.getDataURL()

    try {
      setUploading(true)

      const response = await fetch('/api/clients/company-signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          nombre: nombre.trim(),
          cedula: cedula.trim(),
          signatureDataUrl: dataUrl,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'No se pudo registrar la firma')
      }

      toast.success('Firma de la empresa registrada')
      setOpen(false)
      onSaved?.()
    } catch (error) {
      toast.error('No se pudo registrar la firma', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          {hasRegisteredSignature ? 'Editar firma de la empresa' : 'Registrar firma de la empresa'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{hasRegisteredSignature ? 'Editar firma de la empresa' : 'Registrar firma de la empresa'}</DialogTitle>
          <DialogDescription>
            Esta firma se usará para generar las actas de entrega de hardware del cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre de quien entrega</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Cédula de quien entrega</Label>
              <Input value={cedula} onChange={(e) => setCedula(e.target.value)} required />
            </div>
          </div>

          {initialSignatureUrl && (
            <div className="space-y-2">
              <Label>Firma actual</Label>
              <img src={initialSignatureUrl} alt="Firma actual" className="max-h-28 border rounded-md bg-white p-2" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Nueva firma {initialSignatureUrl ? '(opcional si solo editas datos)' : ''}</Label>
            <div className="border rounded-md p-2 bg-white">
              <SignaturePad ref={sigRef} width={700} height={220} />
            </div>
            <Button type="button" variant="outline" onClick={() => sigRef.current?.clear()}>
              Limpiar firma
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Guardando...' : 'Guardar firma'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
