"use client"

import React, { useRef, useEffect, useState } from 'react'
import { useActaByToken, useSignActa } from '@/hooks/use-actas'
import SignaturePad, { SignaturePadHandle } from '@/components/ui/SignaturePad'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActionLock } from '@/hooks/use-action-lock'
import { CheckCircle2, FileSignature, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = { token?: string }

export default function ActaSigningClient({ token }: Props) {
  const { data: acta, isLoading, isError, error } = useActaByToken(token || '')
  const signMutation = useSignActa()
  const sigRef = useRef<SignaturePadHandle | null>(null)
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [done, setDone] = useState(false)
  const { runWithLock, isLocked } = useActionLock()

  useEffect(() => {
    if (acta) {
      setNombre(acta.cliente_nombre || acta.hardware?.persona_responsable || '')
      setCedula(acta.cliente_cedula || '')
      if (acta.estado_firma === 'completo') {
        setDone(true)
      }
    }
  }, [acta])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    const dataUrl = sigRef.current?.getDataURL()
    if (!dataUrl) {
      toast.error('Firma requerida', { description: 'Dibuja tu firma antes de enviar.' })
      return
    }

    try {
      await runWithLock(async () => {
        await signMutation.mutateAsync({
          token,
          cliente_nombre: nombre,
          cliente_cedula: cedula,
          cliente_firma_dataurl: dataUrl,
        })
      }, { message: 'Enviando firma...' })
      setDone(true)
    } catch {
      // handled by hook
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando acta...
        </div>
      </div>
    )
  }

  if (isError || !acta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Link no válido</h1>
          <p className="mt-2 text-sm text-slate-600">
            {(error as Error)?.message ||
              'Acta no encontrada o el enlace de firma ya no está disponible.'}
          </p>
        </div>
      </div>
    )
  }

  const hardwareName =
    acta.hardware?.name ||
    [acta.hardware?.brand, acta.hardware?.model].filter(Boolean).join(' ') ||
    'Activo tecnológico'
  const serial = acta.hardware?.serial_number

  if (done || acta.estado_firma === 'completo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full rounded-xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Firma registrada</h1>
          <p className="mt-2 text-sm text-slate-600">
            Gracias. El acta de entrega de <strong>{hardwareName}</strong> quedó firmada
            correctamente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-6">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
            <FileSignature className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Firmar acta de entrega</h1>
            <p className="text-sm text-slate-600 mt-1">
              Equipo: <strong>{hardwareName}</strong>
              {serial ? ` · Serie ${serial}` : ''}
            </p>
            {acta.generador_nombre && (
              <p className="text-xs text-slate-500 mt-1">
                Entregado por: {acta.generador_nombre}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Completa tus datos y firma para confirmar la recepción del equipo. No necesitas
          iniciar sesión.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="cedula">Cédula</Label>
            <Input
              id="cedula"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <Label>Firma</Label>
            <div className="border rounded-md p-2 bg-white mt-1">
              <SignaturePad ref={sigRef} width={600} height={220} />
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => sigRef.current?.clear()}
              >
                Limpiar
              </Button>
            </div>
          </div>

          <LoadingButton
            type="submit"
            className="w-full"
            loading={signMutation.status === 'pending' || isLocked}
            loadingText="Enviando firma..."
          >
            Enviar firma
          </LoadingButton>
        </form>
      </div>
    </div>
  )
}
