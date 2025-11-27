"use client"
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useParameterByKey, useUpdateParameter, useDeleteParameter } from '@/hooks/use-parameters'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ParametroDetailPage() {
  const params = useParams()
  const key = typeof params?.key === 'string' ? decodeURIComponent(params.key) : undefined
  const { data, isLoading } = useParameterByKey(key)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [textarea, setTextarea] = useState('')
  const update = useUpdateParameter()
  const del = useDeleteParameter()
  const router = useRouter()

  useEffect(() => {
    if (data) {
      setName(data.name || '')
      setDescription(data.description || '')
      const opts = Array.isArray(data.options) ? data.options : []
      setTextarea(opts.map((o: any) => (o.label ?? o.value ?? String(o))).join('\n'))
    }
  }, [data])

  const onSave = async () => {
    if (!key) return
    const options = textarea.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map((v) => ({ value: v, label: v }))
    try {
      await update.mutateAsync({ keyOrId: key, updates: { name, description, options } })
      toast.success('Guardado')
    } catch (err) {
      console.error(err)
    }
  }

  const onDelete = async () => {
    if (!key) return
    if (!confirm('Eliminar parámetro?')) return
    try {
      await del.mutateAsync(key)
      router.push('/dashboard/parametros')
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) return <div className="p-4">Cargando...</div>
  if (!data) return <div className="p-4">Parámetro no encontrado</div>

  return (
    <ProtectedRoute allowedRoles={["administrador","lider_soporte"]}>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Editar Parámetro</h1>
            <p className="text-muted-foreground">Key: {data.key}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={onDelete}>Eliminar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 max-w-2xl">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Descripción</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Opciones (cada línea será una opción)</Label>
            <Textarea value={textarea} onChange={(e) => setTextarea(e.target.value)} rows={8} />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/parametros')}>Volver</Button>
            <Button onClick={onSave} disabled={update.isPending}>{update.isPending ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
