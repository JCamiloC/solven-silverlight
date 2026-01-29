import React, { useRef, useState } from 'react'
import SignaturePad, { SignaturePadHandle } from '@/components/ui/SignaturePad'
import { useCreateActa } from '@/hooks/use-actas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  hardwareAssetId: string
  onCreated?: (link: string) => void
}

export default function ActaGeneratorModal({ hardwareAssetId, onCreated }: Props) {
  const sigRef = useRef<SignaturePadHandle | null>(null)
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')

  const create = useCreateActa()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const dataUrl = sigRef.current?.getDataURL()
    try {
      const res: any = await create.mutateAsync({
        hardware_asset_id: hardwareAssetId,
        generador_nombre: nombre,
        generador_cedula: cedula,
        generador_firma_dataurl: dataUrl,
      })

      if (res?.link_temporal && onCreated) onCreated(res.link_temporal)
    } catch (err) {
      // handled by hook
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-2">
        <Label>Nombre</Label>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Label>Cédula</Label>
        <Input value={cedula} onChange={(e) => setCedula(e.target.value)} required />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Label>Firma</Label>
        <div className="border rounded p-2">
          <SignaturePad ref={sigRef} width={500} height={200} />
        </div>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" type="button" onClick={() => sigRef.current?.clear()}>Limpiar</Button>
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={create.isLoading} className="w-full">Generar link y guardar</Button>
      </div>
    </form>
  )
}
