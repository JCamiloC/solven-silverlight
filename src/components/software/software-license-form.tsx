'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  useCreateSoftwareLicense,
  useUpdateSoftwareLicense,
  useSoftwareLicense,
} from '@/hooks/use-software'
import { useClients } from '@/hooks/use-clients'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { SoftwareLicenseWithRelations } from '@/lib/services/software'
import { useActionLock } from '@/hooks/use-action-lock'

const formSchema = z.object({
  client_id: z.string().min(1, 'Selecciona un cliente'),
  name: z.string().min(1, 'El nombre es requerido'),
  vendor: z.string().min(1, 'El proveedor es requerido'),
  version: z.string().min(1, 'La versión es requerida'),
  license_key: z.string().min(1, 'La clave de licencia es requerida'),
  license_type: z.enum(['perpetual', 'subscription', 'oem']),
  periodicidad: z.enum(['mensual', 'anual']).optional(),
  seats: z.number().min(1, 'Debe tener al menos 1 puesto'),
  expiry_date: z.string().optional(),
  status: z.enum(['active', 'expired', 'cancelled']),
})

type FormValues = z.infer<typeof formSchema>

interface SoftwareLicenseFormProps {
  license?: SoftwareLicenseWithRelations
  licenseId?: string
  clientId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function SoftwareLicenseForm({
  license,
  licenseId,
  clientId,
  onSuccess,
  onCancel,
}: SoftwareLicenseFormProps) {
  const { data: clients, isLoading: loadingClients } = useClients()
  const { data: existingLicense, isLoading: loadingLicense } = useSoftwareLicense(licenseId || '')
  const createLicense = useCreateSoftwareLicense()
  const updateLicense = useUpdateSoftwareLicense()
  const { runWithLock, isLocked } = useActionLock()

  const licenseData = license || existingLicense

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: clientId || licenseData?.client_id || '',
      name: licenseData?.name || '',
      vendor: licenseData?.vendor || '',
      version: licenseData?.version || '',
      license_key: licenseData?.license_key || '',
      license_type: licenseData?.license_type || 'subscription',
      periodicidad: licenseData?.periodicidad || undefined,
      seats: licenseData?.seats || 1,
      expiry_date: licenseData?.expiry_date || '',
      status: licenseData?.status || 'active',
    },
  })

  useEffect(() => {
    if (licenseData) {
      form.reset({
        client_id: clientId || licenseData.client_id,
        name: licenseData.name,
        vendor: licenseData.vendor,
        version: licenseData.version,
        license_key: licenseData.license_key,
        license_type: licenseData.license_type,
        periodicidad: licenseData.periodicidad || undefined,
        seats: licenseData.seats,
        expiry_date: licenseData.expiry_date || '',
        status: licenseData.status,
      })
    } else if (clientId) {
      // Si no hay licenseData pero sí clientId, actualizar solo el cliente
      form.setValue('client_id', clientId)
    }
  }, [licenseData, form, clientId])

  const onSubmit = async (data: FormValues) => {
    try {
      const cleanedData = {
        ...data,
        expiry_date: data.expiry_date || undefined,
      }

      await runWithLock(async () => {
        if (licenseData) {
          await updateLicense.mutateAsync({
            id: licenseData.id,
            data: cleanedData,
          })
        } else {
          await createLicense.mutateAsync(cleanedData as any)
        }
      }, { message: licenseData ? 'Actualizando licencia...' : 'Creando licencia...' })

      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error('Error saving license:', error)
    }
  }

  const isSubmitting = createLicense.isPending || updateLicense.isPending || isLocked

  if (loadingLicense) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Información Básica */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Información Básica</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!clientId || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingClients ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="expired">Vencida</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de producto *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ej: Microsoft Office 365 Business"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Microsoft, Adobe, Autodesk"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Versión *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: 2024, 3.5, Pro"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Licencia */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Detalles de Licencia</h3>
          
          <FormField
            control={form.control}
            name="license_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Clave de Licencia *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                    disabled={isSubmitting}
                    type="password"
                  />
                </FormControl>
                <FormDescription>
                  La clave se almacenará de forma segura
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="license_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Licencia *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="subscription">Suscripción</SelectItem>
                      <SelectItem value="perpetual">Perpetua</SelectItem>
                      <SelectItem value="oem">OEM</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Puestos *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      placeholder="1"
                      disabled={isSubmitting}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Fechas y Periodicidad */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Fechas y Periodicidad</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Vencimiento</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Opcional para licencias perpetuas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="periodicidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Periodicidad</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione la periodicidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Frecuencia de pago o renovación
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          )}
          <LoadingButton type="submit" loading={isSubmitting} loadingText={licenseData ? 'Actualizando licencia...' : 'Creando licencia...'}>
            {licenseData ? 'Actualizar' : 'Crear'} Licencia
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
