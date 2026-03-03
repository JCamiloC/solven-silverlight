'use client'

import { useEffect, useRef, useState } from 'react'
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
  initialSignatureUpdatedAt?: string
  onSaved?: () => void
}

export default function ClientCompanySignatureModal({
  clientId,
  initialName,
  initialCedula,
  initialSignatureUrl,
  initialSignatureUpdatedAt,
  onSaved,
}: Props) {
  const sigRef = useRef<SignaturePadHandle | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState(initialName || '')
  const [cedula, setCedula] = useState(initialCedula || '')
  const [uploading, setUploading] = useState(false)
  const [uploadedSignatureDataUrl, setUploadedSignatureDataUrl] = useState<string | null>(null)

  const hasRegisteredSignature = Boolean(initialSignatureUrl)

  const getSignaturePreviewUrl = (url?: string) => {
    if (!url) return null
    const separator = url.includes('?') ? '&' : '?'
    const version = initialSignatureUpdatedAt || Date.now().toString()
    return `${url}${separator}v=${encodeURIComponent(version)}`
  }

  useEffect(() => {
    if (!open) return

    setNombre(initialName || '')
    setCedula(initialCedula || '')
    setUploadedSignatureDataUrl(getSignaturePreviewUrl(initialSignatureUrl))
    sigRef.current?.clear()

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [open, initialName, initialCedula, initialSignatureUrl, initialSignatureUpdatedAt])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen válida')
      event.target.value = ''
      return
    }

    const maxSizeInBytes = 4 * 1024 * 1024
    if (file.size > maxSizeInBytes) {
      toast.error('La imagen no debe superar 4MB')
      event.target.value = ''
      return
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
            return
          }
          reject(new Error('No se pudo leer la imagen'))
        }
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
        reader.readAsDataURL(file)
      })

      setUploadedSignatureDataUrl(dataUrl)
      sigRef.current?.clear()
      toast.success('Imagen de firma cargada')
    } catch (error) {
      toast.error('No se pudo procesar la imagen', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    }
  }

  const clearUploadedImage = () => {
    setUploadedSignatureDataUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim() || !cedula.trim()) {
      toast.error('Debes completar nombre y cédula')
      return
    }

    const drawnDataUrl = sigRef.current?.getDataURL()
    const uploadedDataUrl = uploadedSignatureDataUrl?.startsWith('data:image/')
      ? uploadedSignatureDataUrl
      : null
    const signatureDataUrl = uploadedDataUrl || drawnDataUrl

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
          signatureDataUrl,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'No se pudo registrar la firma')
      }

      toast.success('Firma de la empresa registrada')
      clearUploadedImage()
      sigRef.current?.clear()
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

          <div className="space-y-2">
            <Label>Nueva firma {initialSignatureUrl ? '(opcional si solo editas datos)' : ''}</Label>
            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-sm">Subir imagen de firma</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileUpload}
              />

              {uploadedSignatureDataUrl && (
                <div className="space-y-2">
                  <img
                    src={uploadedSignatureDataUrl}
                    alt="Vista previa de firma cargada"
                    className="max-h-28 border rounded-md bg-white p-2"
                  />
                  <Button type="button" variant="outline" onClick={clearUploadedImage}>
                    Quitar imagen
                  </Button>
                </div>
              )}
            </div>

            <Label className="text-sm">O dibujar firma manualmente</Label>
            <div className="border rounded-md p-2 bg-white">
              <SignaturePad ref={sigRef} width={700} height={220} />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                sigRef.current?.clear()
                clearUploadedImage()
              }}
            >
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
