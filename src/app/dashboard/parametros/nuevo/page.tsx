"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useCreateParameter } from '@/hooks/use-parameters'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Trash2, GripVertical, ArrowLeft } from 'lucide-react'

export default function NuevoParametroPage() {
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState<Array<{ id: string; value: string; label: string }>>([])
  const create = useCreateParameter()
  const router = useRouter()

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
    if (!key || !name) {
      toast.error('Key y nombre son requeridos')
      return
    }

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
      console.debug('NuevoParametro.onSave payload:', { key, name, description, options: backendOptions })
      const res = await create.mutateAsync({ key, name, description, options: backendOptions })
      console.debug('NuevoParametro.create result:', res)
      toast.success('Parámetro creado correctamente')
      router.push('/dashboard/parametros')
    } catch (err) {
      console.error('NuevoParametro.onSave error:', err)
      toast.error('Error al crear el parámetro')
    }
  }

  return (
    <ProtectedRoute allowedRoles={["administrador","lider_soporte"]}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/parametros')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Crear Nuevo Parámetro</h1>
            <p className="text-sm text-muted-foreground">Define un nuevo parámetro del sistema</p>
          </div>
        </div>

        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
            <CardDescription>
              Identificador, nombre y descripción del parámetro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="key">Key (identificador único)</Label>
              <Input 
                id="key"
                value={key} 
                onChange={(e) => setKey(e.target.value)} 
                placeholder="ej: tipos_hardware"
              />
              <p className="text-xs text-muted-foreground mt-1">Sin espacios, use guiones bajos o medios</p>
            </div>
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
              <Label htmlFor="description">Descripción (opcional)</Label>
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
                  Define las opciones disponibles para este parámetro
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
            disabled={create.isPending}
            className="w-full sm:w-auto"
          >
            {create.isPending ? 'Creando...' : 'Crear Parámetro'}
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  )
}

