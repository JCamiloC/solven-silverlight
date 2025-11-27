"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useCreateParameter } from '@/hooks/use-parameters'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function NuevoParametroPage() {
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [textarea, setTextarea] = useState('')
  const create = useCreateParameter()
  const router = useRouter()

  const onSave = async () => {
    if (!key || !name) return toast.error('Key y nombre son requeridos')
    const options = textarea.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map((v) => ({ value: v, label: v }))
    try {
      console.debug('NuevoParametro.onSave payload:', { key, name, description, options })
      const res = await create.mutateAsync({ key, name, description, options })
      console.debug('NuevoParametro.create result:', res)
      router.push('/dashboard/parametros')
    } catch (err) {
      console.error('NuevoParametro.onSave error:', err)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["administrador","lider_soporte"]}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">Crear Parámetro</h1>
        <div className="grid grid-cols-1 gap-4 max-w-2xl">
          <div>
            <Label>Key (identificador, sin espacios)</Label>
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. sistemas_operativos" />
          </div>
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sistemas Operativos" />
          </div>
          <div>
            <Label>Descripción (opcional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Opciones (cada línea será una opción)</Label>
            <Textarea value={textarea} onChange={(e) => setTextarea(e.target.value)} rows={8} placeholder={"Windows 10\nWindows 11\nUbuntu 22.04"} />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/parametros')}>Cancelar</Button>
            <Button onClick={onSave} disabled={create.isPending}>{create.isPending ? 'Guardando...' : 'Crear'}</Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
