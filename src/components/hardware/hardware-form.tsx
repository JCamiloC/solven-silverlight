'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { HardwareAsset } from '@/types'
import { useCreateHardware, useUpdateHardware } from '@/hooks/use-hardware'
import { useClients } from '@/hooks/use-clients'

const hardwareSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.string().min(1, 'El tipo es requerido'),
  brand: z.string().min(1, 'La marca es requerida'),
  model: z.string().min(1, 'El modelo es requerido'),
  serial_number: z.string().min(1, 'El número de serie es requerido'),
  specifications: z.record(z.string(), z.any()).optional(),
  purchase_date: z.string(),
  warranty_expiry: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'retired']),
  location: z.string(),
  assigned_to: z.string().optional(),
  client_id: z.string().min(1, 'El cliente es requerido'),
})

type HardwareFormData = z.infer<typeof hardwareSchema>

interface HardwareFormProps {
  asset?: HardwareAsset
  onSuccess?: () => void
  onCancel?: () => void
}

export function HardwareForm({ asset, onSuccess, onCancel }: HardwareFormProps) {
  const [specificationsText, setSpecificationsText] = useState(
    asset?.specifications ? JSON.stringify(asset.specifications, null, 2) : ''
  )
  
  const { data: clients } = useClients()
  const createMutation = useCreateHardware()
  const updateMutation = useUpdateHardware()

  const form = useForm<HardwareFormData>({
    resolver: zodResolver(hardwareSchema),
    defaultValues: {
      name: asset?.name || '',
      type: asset?.type || '',
      brand: asset?.brand || '',
      model: asset?.model || '',
      serial_number: asset?.serial_number || '',
      purchase_date: asset?.purchase_date || '',
      warranty_expiry: asset?.warranty_expiry || '',
      status: asset?.status || 'active',
      location: asset?.location || '',
      assigned_to: asset?.assigned_to || '',
      client_id: asset?.client_id || '',
    },
  })

  const onSubmit = async (data: HardwareFormData) => {
    try {
      // Parse specifications if provided
      let specifications = undefined
      if (specificationsText.trim()) {
        try {
          specifications = JSON.parse(specificationsText)
        } catch (error) {
          // If JSON parsing fails, treat as plain text
          specifications = { description: specificationsText }
        }
      }

      const hardwareData = {
        ...data,
        specifications,
      }

      if (asset) {
        await updateMutation.mutateAsync({ id: asset.id, updates: hardwareData })
      } else {
        await createMutation.mutateAsync(hardwareData)
      }
      
      onSuccess?.()
    } catch (error) {
      console.error('Error saving hardware:', error)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Equipo</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Dell Latitude 5520" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="printer">Impresora</SelectItem>
                    <SelectItem value="monitor">Monitor</SelectItem>
                    <SelectItem value="server">Servidor</SelectItem>
                    <SelectItem value="network">Red</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Dell" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Latitude 5520" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="serial_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Serie</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: DL5520-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="retired">Retirado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="purchase_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Compra</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="warranty_expiry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vencimiento de Garantía</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ubicación</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Oficina Principal - Piso 2" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="assigned_to"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asignado a</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del usuario asignado" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-2">
          <Label htmlFor="specifications">Especificaciones (JSON)</Label>
          <Textarea 
            id="specifications"
            placeholder='{"processor": "Intel Core i7", "ram": "16GB", "storage": "512GB SSD"}'
            value={specificationsText}
            onChange={(e) => setSpecificationsText(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Ingrese las especificaciones en formato JSON o texto libre
          </p>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : asset ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Form>
  )
}