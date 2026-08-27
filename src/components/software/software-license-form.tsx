'use client'

import { useEffect, useRef } from 'react'
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
import { useHydrateFormOnce, useSubmitGuard } from '@/hooks/use-form-guards'

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

function toFormValues(
  source: SoftwareLicenseWithRelations | undefined,
  clientId?: string
): FormValues {
  return {
    client_id: clientId || source?.client_id || '',
    name: source?.name || '',
    vendor: source?.vendor || '',
    version: source?.version || '',
    license_key: source?.license_key || '',
    license_type: source?.license_type || 'subscription',
    periodicidad: source?.periodicidad || undefined,
    seats: source?.seats || 1,
    expiry_date: source?.expiry_date || '',
    status: source?.status || 'active',
  }
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
  const { runGuarded } = useSubmitGuard()
  const licenseDataRef = useRef(license || existingLicense)

  const licenseData = license || existingLicense || undefined
  licenseDataRef.current = licenseData
  const entityId = licenseData?.id

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(licenseData, clientId),
  })

  useHydrateFormOnce(form, entityId, () => toFormValues(licenseDataRef.current || undefined, clientId))

  // Solo client_id en modo creación (sin pisar el resto del form)
  useEffect(() => {
    if (entityId || !clientId) return
    form.setValue('client_id', clientId)
  }, [clientId, entityId, form])

  const onSubmit = async (data: FormValues) => {
    await runGuarded(async () => {
      try {
        const cleanedData = {
          ...data,
          expiry_date: data.expiry_date || undefined,
        }
        const current = licenseDataRef.current

        await runWithLock(async () => {
          if (current?.id) {
            await updateLicense.mutateAsync({
              id: current.id,
              data: cleanedData,
            })
          } else {
            await createLicense.mutateAsync(cleanedData as any)
            form.reset(toFormValues(undefined, clientId))
          }
        }, { message: current?.id ? 'Actualizando licencia...' : 'Creando licencia...' })

        onSuccess?.()
      } catch (error) {
        console.error('Error saving license:', error)
      }
    })
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
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingText={entityId ? 'Actualizando licencia...' : 'Creando licencia...'}
          >
            {entityId ? 'Actualizar' : 'Crear'} Licencia
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
