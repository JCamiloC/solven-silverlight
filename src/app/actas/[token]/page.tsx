"use client"

import React, { useRef, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useActaByToken, useSignActa } from '@/hooks/use-actas'
import SignaturePad, { SignaturePadHandle } from '@/components/ui/SignaturePad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = { params: { token: string } }

export default function ActaSigningPage({ params }: Props) {
  const token = params?.token
  const { data: acta, isLoading } = useActaByToken(token || '')
  const signMutation = useSignActa()
  const sigRef = useRef<SignaturePadHandle | null>(null)
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (acta) {
      setNombre(acta.cliente_nombre || '')
      setCedula(acta.cliente_cedula || '')
    }
  }, [acta])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const dataUrl = sigRef.current?.getDataURL()
    try {
      await signMutation.mutateAsync({ token, cliente_nombre: nombre, cliente_cedula: cedula, cliente_firma_dataurl: dataUrl })
      setDone(true)
    } catch (err) {
      // handled by hook
    }
  }

  if (isLoading) return <div>Cargando...</div>
  if (!acta) return <div>Acta no encontrada o link inválido.</div>

  if (done) return <div>Firma guardada. Gracias.</div>

  return (
    <div className="max-w-xl mx-auto p-4">
      <h2 className="text-lg font-semibold mb-2">Firmar acta</h2>
      <p className="text-sm text-muted-foreground mb-4">Activo relacionado: {acta.hardware_asset_id}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          <Label>Nombre</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Label>Cédula</Label>
          <Input value={cedula} onChange={(e) => setCedula(e.target.value)} required />
        </div>

        <div>
          <Label>Firma</Label>
          <div className="border rounded p-2">
            <SignaturePad ref={sigRef} width={600} height={220} />
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" type="button" onClick={() => sigRef.current?.clear()}>Limpiar</Button>
          </div>
        </div>

        <div>
          <Button type="submit" className="w-full" disabled={signMutation.isLoading}>Enviar firma</Button>
        </div>
      </form>
    </div>
  )
}
