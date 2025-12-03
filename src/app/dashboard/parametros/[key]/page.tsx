"use client"
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useParameterByKey, useUpdateParameter, useDeleteParameter } from '@/hooks/use-parameters'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Trash2, GripVertical, ArrowLeft } from 'lucide-react'

export default function ParametroDetailPage() {
  const params = useParams()
  const key = typeof params?.key === 'string' ? decodeURIComponent(params.key) : undefined
  const { data, isLoading } = useParameterByKey(key)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState<Array<{ id: string; value: string; label: string }>>([])
  const update = useUpdateParameter()
  const del = useDeleteParameter()
  const router = useRouter()

  useEffect(() => {
    if (data) {
      setName(data.name || '')
      setDescription(data.description || '')
      const opts = Array.isArray(data.options) ? data.options : []
      // Convertir opciones a formato con ID único para manejo en UI
      setOptions(opts.map((o: any, idx: number) => ({
        id: `${Date.now()}-${idx}`,
        value: o.value ?? o.label ?? String(o),
        label: o.label ?? o.value ?? String(o)
      })))
    }
  }, [data])

  const addOption = () => {
    setOptions([...options, { id: `${Date.now()}`, value: '', label: '' }])
  }

  const removeOption = (id: string) => {
    setOptions(options.filter(opt => opt.id !== id))
  }

  const updateOption = (id: string, field: 'value' | 'label', newValue: string) => {
    setOptions(options.map(opt => 
      opt.id === id 
        ? { ...opt, [field]: newValue } 
        : opt
    ))
  }

  const onSave = async () => {
    if (!key) return
    
    // Validar que no haya opciones vacías
    const validOptions = options.filter(opt => opt.value.trim() !== '' && opt.label.trim() !== '')
    
    if (validOptions.length === 0) {
      toast.error('Debe agregar al menos una opción válida')
      return
    }

    // Convertir a formato backend (sin el id temporal)
    const backendOptions = validOptions.map(opt => ({
      value: opt.value.trim(),
      label: opt.label.trim()
    }))

    try {
      await update.mutateAsync({ 
        keyOrId: key, 
        updates: { name, description, options: backendOptions } 
      })
      toast.success('Parámetro actualizado correctamente')
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar el parámetro')
    }
  }

  const onDelete = async () => {
    if (!key) return
    if (!confirm('¿Está seguro de eliminar este parámetro? Esta acción no se puede deshacer.')) return
    try {
      await del.mutateAsync(key)
      toast.success('Parámetro eliminado')
      router.push('/dashboard/parametros')
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar el parámetro')
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["administrador","lider_soporte"]}>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Cargando parámetro...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!data) {
    return (
      <ProtectedRoute allowedRoles={["administrador","lider_soporte"]}>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Parámetro no encontrado</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/dashboard/parametros')}
                >
                  Volver a Parámetros
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["administrador","lider_soporte"]}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/parametros')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Editar Parámetro</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Key: <code className="bg-muted px-2 py-1 rounded">{data.key}</code></p>
            </div>
          </div>
          <Button variant="destructive" onClick={onDelete} className="w-full sm:w-auto">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>

        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
            <CardDescription>
              Nombre y descripción del parámetro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Parámetro</Label>
              <Input 
                id="name"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ej: Tipos de Hardware"
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input 
                id="description"
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Breve descripción del parámetro"
              />
            </div>
          </CardContent>
        </Card>

        {/* Opciones */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <CardTitle>Opciones</CardTitle>
                <CardDescription>
                  Gestiona las opciones disponibles para este parámetro
                </CardDescription>
              </div>
              <Button onClick={addOption} size="sm" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Opción
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {options.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">No hay opciones configuradas</p>
                <Button onClick={addOption} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Primera Opción
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div 
                    key={option.id}
                    className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="cursor-move text-muted-foreground hidden sm:block">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`value-${option.id}`} className="text-xs text-muted-foreground">
                          Valor (ID interno)
                        </Label>
                        <Input
                          id={`value-${option.id}`}
                          value={option.value}
                          onChange={(e) => updateOption(option.id, 'value', e.target.value)}
                          placeholder="valor_interno"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`label-${option.id}`} className="text-xs text-muted-foreground">
                          Etiqueta (Texto visible)
                        </Label>
                        <Input
                          id={`label-${option.id}`}
                          value={option.label}
                          onChange={(e) => updateOption(option.id, 'label', e.target.value)}
                          placeholder="Texto que verá el usuario"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(option.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/parametros')}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            onClick={onSave} 
            disabled={update.isPending}
            className="w-full sm:w-auto"
          >
            {update.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  )
}
