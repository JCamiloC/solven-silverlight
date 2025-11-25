
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { HardwareAsset } from '@/types';
import { useCreateHardware, useUpdateHardware } from '@/hooks/use-hardware';

const softwareExtraSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  sl: z.boolean(),
  fecha_vencimiento: z.string().optional(),
});

const hardwareSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.string().min(1, 'El tipo es requerido'),
  brand: z.string().min(1, 'La marca es requerida'),
  model: z.string().min(1, 'El modelo es requerido'),
  serial_number: z.string().min(1, 'El número de serie es requerido'),
  status: z.enum(['active', 'maintenance', 'retired']),
  sede: z.string().min(1, 'La sede es requerida'),
  area_encargada: z.string().min(1, 'El área es requerida'),
  persona_responsable: z.string().min(1, 'La persona responsable es requerida'),
  procesador: z.string().min(1, 'Procesador requerido'),
  memoria_ram: z.string().min(1, 'Memoria RAM requerida'),
  disco_duro: z.string().min(1, 'Disco duro requerido'),
  sistema_operativo: z.object({
    nombre: z.string().min(1, 'SO requerido'),
    sl: z.boolean(),
    fecha_vencimiento: z.string().optional(),
  }),
  ms_office: z.object({
    nombre: z.string().min(1, 'MS Office requerido'),
    sl: z.boolean(),
    fecha_vencimiento: z.string().optional(),
  }),
  antivirus: z.object({
    nombre: z.string().min(1, 'Antivirus requerido'),
    sl: z.boolean(),
    fecha_vencimiento: z.string().optional(),
  }),
  software_extra: z.array(softwareExtraSchema).optional(),
  mouse: z.boolean().optional(),
  diadema: z.boolean().optional(),
  teclado: z.boolean().optional(),
  otro_periferico: z.string().optional(),
  observaciones: z.string().optional(),
  client_id: z.string().min(1),
});

type HardwareFormData = z.infer<typeof hardwareSchema>;

interface HardwareFormProps {
  asset?: HardwareAsset;
  clientId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function HardwareForm({ asset, clientId, onSuccess, onCancel }: HardwareFormProps) {
  const createMutation = useCreateHardware();
  const updateMutation = useUpdateHardware();

  const form = useForm<HardwareFormData>({
    resolver: zodResolver(hardwareSchema),
    defaultValues: {
      name: asset?.name || '',
      type: asset?.type || '',
      brand: asset?.brand || '',
      model: asset?.model || '',
      serial_number: asset?.serial_number || '',
      status: asset?.status || 'active',
      sede: asset?.sede || '',
      area_encargada: asset?.area_encargada || '',
      persona_responsable: asset?.persona_responsable || '',
      procesador: asset?.procesador || '',
      memoria_ram: asset?.memoria_ram || '',
      disco_duro: asset?.disco_duro || '',
      sistema_operativo: asset?.sistema_operativo || { nombre: '', sl: false, fecha_vencimiento: '' },
      ms_office: asset?.ms_office || { nombre: '', sl: false, fecha_vencimiento: '' },
      antivirus: asset?.antivirus || { nombre: '', sl: false, fecha_vencimiento: '' },
      software_extra: asset?.software_extra || [],
      mouse: asset?.mouse || false,
      diadema: asset?.diadema || false,
      teclado: asset?.teclado || false,
      otro_periferico: asset?.otro_periferico || '',
      observaciones: asset?.observaciones || '',
      client_id: clientId,
    },
  });

  const {
    fields: softwareFields,
    append: appendSoftware,
    remove: removeSoftware,
  } = useFieldArray({
    control: form.control,
    name: 'software_extra',
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data: HardwareFormData) => {
    try {
      if (asset) {
        await updateMutation.mutateAsync({ id: asset.id, updates: data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Error saving hardware:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Sección 1: Datos Generales */}
        <h3 className="text-base font-semibold mb-2">Datos Generales</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl>
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
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="brand" render={({ field }) => (
            <FormItem>
              <FormLabel>Marca</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="model" render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="serial_number" render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Serie</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="retired">Retirado</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="sede" render={({ field }) => (
            <FormItem>
              <FormLabel>Sede</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="area_encargada" render={({ field }) => (
            <FormItem>
              <FormLabel>Área Encargada</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="persona_responsable" render={({ field }) => (
          <FormItem>
            <FormLabel>Persona Responsable</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Sección 2: Hardware */}
        <h3 className="text-base font-semibold mb-2">Hardware</h3>
        <div className="grid grid-cols-3 gap-4">
          <FormField control={form.control} name="procesador" render={({ field }) => (
            <FormItem>
              <FormLabel>Procesador</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="memoria_ram" render={({ field }) => (
            <FormItem>
              <FormLabel>Memoria RAM</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="disco_duro" render={({ field }) => (
            <FormItem>
              <FormLabel>Disco Duro</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Sección 3: Software */}
        <h3 className="text-base font-semibold mb-2">Software</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="sistema_operativo" render={({ field }) => (
            <FormItem>
              <FormLabel>Sistema Operativo</FormLabel>
              <FormControl>
                <div className="flex flex-col gap-2">
                  <Input placeholder="Nombre" value={field.value.nombre} onChange={e => field.onChange({ ...field.value, nombre: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <Label>SL</Label>
                    <Input type="checkbox" checked={field.value.sl} onChange={e => field.onChange({ ...field.value, sl: e.target.checked })} />
                  </div>
                  <Input type="date" value={field.value.fecha_vencimiento} onChange={e => field.onChange({ ...field.value, fecha_vencimiento: e.target.value })} disabled={field.value.sl} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="ms_office" render={({ field }) => (
            <FormItem>
              <FormLabel>MS Office</FormLabel>
              <FormControl>
                <div className="flex flex-col gap-2">
                  <Input placeholder="Nombre" value={field.value.nombre} onChange={e => field.onChange({ ...field.value, nombre: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <Label>SL</Label>
                    <Input type="checkbox" checked={field.value.sl} onChange={e => field.onChange({ ...field.value, sl: e.target.checked })} />
                  </div>
                  <Input type="date" value={field.value.fecha_vencimiento} onChange={e => field.onChange({ ...field.value, fecha_vencimiento: e.target.value })} disabled={field.value.sl} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="antivirus" render={({ field }) => (
            <FormItem>
              <FormLabel>Antivirus</FormLabel>
              <FormControl>
                <div className="flex flex-col gap-2">
                  <Input placeholder="Nombre" value={field.value.nombre} onChange={e => field.onChange({ ...field.value, nombre: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <Label>SL</Label>
                    <Input type="checkbox" checked={field.value.sl} onChange={e => field.onChange({ ...field.value, sl: e.target.checked })} />
                  </div>
                  <Input type="date" value={field.value.fecha_vencimiento} onChange={e => field.onChange({ ...field.value, fecha_vencimiento: e.target.value })} disabled={field.value.sl} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="space-y-2">
          <Label>Software Extra</Label>
          {softwareFields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-5 gap-2 items-center">
              <Input {...form.register(`software_extra.${idx}.nombre`)} placeholder="Nombre" />
              <div className="flex items-center gap-2">
                <Label>SL</Label>
                <Input type="checkbox" {...form.register(`software_extra.${idx}.sl`)} />
              </div>
              <Input type="date" {...form.register(`software_extra.${idx}.fecha_vencimiento`)} placeholder="Fecha Vencimiento" disabled={form.watch(`software_extra.${idx}.sl`)} />
              <Button type="button" variant="outline" onClick={() => removeSoftware(idx)}>-</Button>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => appendSoftware({ nombre: '', sl: false, fecha_vencimiento: '' })}>+ Agregar Software</Button>
        </div>

        {/* Sección 4: Periféricos */}
        <h3 className="text-base font-semibold mb-2">Periféricos</h3>
        <div className="grid grid-cols-4 gap-4">
          <FormField control={form.control} name="mouse" render={({ field }) => (
            <FormItem>
              <FormLabel>Mouse</FormLabel>
              <FormControl><Input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="diadema" render={({ field }) => (
            <FormItem>
              <FormLabel>Diadema</FormLabel>
              <FormControl><Input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="teclado" render={({ field }) => (
            <FormItem>
              <FormLabel>Teclado</FormLabel>
              <FormControl><Input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="otro_periferico" render={({ field }) => (
            <FormItem>
              <FormLabel>Otro Periférico</FormLabel>
              <FormControl><Input {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        {/* Sección 5: Observaciones */}
        <h3 className="text-base font-semibold mb-2">Observaciones</h3>
        <FormField control={form.control} name="observaciones" render={({ field }) => (
          <FormItem>
            <FormLabel>Observaciones</FormLabel>
            <FormControl><Textarea rows={3} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : asset ? 'Actualizar' : 'Guardar'}</Button>
        </div>
      </form>
    </Form>
  );
}