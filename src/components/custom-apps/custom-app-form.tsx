'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  useCreateCustomApplication,
  useUpdateCustomApplication,
} from '@/hooks/use-custom-applications'
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
import { CustomApplicationWithRelations } from '@/lib/services/custom-applications'
import { useActionLock } from '@/hooks/use-action-lock'

const formSchema = z.object({
  client_id: z.string().min(1, 'Selecciona un cliente'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  status: z.enum(['active', 'development', 'maintenance', 'inactive']),
  
  // URLs
  production_url: z.string().url('URL inválida').optional().or(z.literal('')),
  staging_url: z.string().url('URL inválida').optional().or(z.literal('')),
  development_url: z.string().url('URL inválida').optional().or(z.literal('')),
  admin_panel_url: z.string().url('URL inválida').optional().or(z.literal('')),
  
  // Hosting
  hosting_provider: z.string().optional(),
  hosting_plan: z.string().optional(),
  hosting_renewal_date: z.string().optional(),
  
  // Domain
  domain_registrar: z.string().optional(),
  domain_expiry_date: z.string().optional(),
  
  // Database
  database_type: z.string().optional(),
  database_host: z.string().optional(),
  database_name: z.string().optional(),
  
  // Repository
  repository_url: z.string().url('URL inválida').optional().or(z.literal('')),
  repository_branch: z.string().optional(),
  
  // Technologies
  frontend_tech: z.string().optional(),
  backend_tech: z.string().optional(),
  mobile_tech: z.string().optional(),
  
  // Additional
  ssl_certificate: z.string().optional(),
  ssl_expiry_date: z.string().optional(),
  cdn_provider: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CustomAppFormProps {
  application?: CustomApplicationWithRelations
  clientId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function CustomAppForm({
  application,
  clientId,
  onSuccess,
  onCancel,
}: CustomAppFormProps) {
  const { data: clients, isLoading: loadingClients } = useClients()
  const createApp = useCreateCustomApplication()
  const updateApp = useUpdateCustomApplication()
  const { runWithLock, isLocked } = useActionLock()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: clientId || application?.client_id || '',
      name: application?.name || '',
      description: application?.description || '',
      status: application?.status || 'development',
      production_url: application?.production_url || '',
      staging_url: application?.staging_url || '',
      development_url: application?.development_url || '',
      admin_panel_url: application?.admin_panel_url || '',
      hosting_provider: application?.hosting_provider || '',
      hosting_plan: application?.hosting_plan || '',
      hosting_renewal_date: application?.hosting_renewal_date || '',
      domain_registrar: application?.domain_registrar || '',
      domain_expiry_date: application?.domain_expiry_date || '',
      database_type: application?.database_type || '',
      database_host: application?.database_host || '',
      database_name: application?.database_name || '',
      repository_url: application?.repository_url || '',
      repository_branch: application?.repository_branch || 'main',
      frontend_tech: application?.frontend_tech || '',
      backend_tech: application?.backend_tech || '',
      mobile_tech: application?.mobile_tech || '',
      ssl_certificate: application?.ssl_certificate || '',
      ssl_expiry_date: application?.ssl_expiry_date || '',
      cdn_provider: application?.cdn_provider || '',
      notes: application?.notes || '',
    },
  })

  // Actualizar el formulario cuando cambian los props
  useEffect(() => {
    form.reset({
      client_id: clientId || application?.client_id || '',
      name: application?.name || '',
      description: application?.description || '',
      status: application?.status || 'development',
      production_url: application?.production_url || '',
      staging_url: application?.staging_url || '',
      development_url: application?.development_url || '',
      admin_panel_url: application?.admin_panel_url || '',
      hosting_provider: application?.hosting_provider || '',
      hosting_plan: application?.hosting_plan || '',
      hosting_renewal_date: application?.hosting_renewal_date || '',
      domain_registrar: application?.domain_registrar || '',
      domain_expiry_date: application?.domain_expiry_date || '',
      database_type: application?.database_type || '',
      database_host: application?.database_host || '',
      database_name: application?.database_name || '',
      repository_url: application?.repository_url || '',
      repository_branch: application?.repository_branch || 'main',
      frontend_tech: application?.frontend_tech || '',
      backend_tech: application?.backend_tech || '',
      mobile_tech: application?.mobile_tech || '',
      ssl_certificate: application?.ssl_certificate || '',
      ssl_expiry_date: application?.ssl_expiry_date || '',
      cdn_provider: application?.cdn_provider || '',
      notes: application?.notes || '',
    })
  }, [application, clientId, form])

  const onSubmit = async (data: FormValues) => {
    try {
      // Convert empty strings to null for optional fields
      const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = value === '' ? null : value
        return acc
      }, {} as any)

      await runWithLock(async () => {
        if (application) {
          await updateApp.mutateAsync({
            id: application.id,
            data: cleanedData,
          })
        } else {
          await createApp.mutateAsync(cleanedData)
        }
      }, { message: application ? 'Actualizando aplicación...' : 'Creando aplicación...' })

      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error('Error saving application:', error)
    }
  }

  const isSubmitting = createApp.isPending || updateApp.isPending || isLocked

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
                    defaultValue={field.value}
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
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="development">Desarrollo</SelectItem>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="maintenance">Mantenimiento</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
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
                <FormLabel>Nombre de la Aplicación *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ej: Sistema de Inventario"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descripción breve de la aplicación..."
                    rows={3}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* URLs */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">URLs</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="production_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Producción</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://app.ejemplo.com"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>URL del sitio en producción</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="staging_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Staging</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://staging.ejemplo.com"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>URL del ambiente de pruebas</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="development_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Desarrollo</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="http://localhost:3000"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="admin_panel_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Panel Admin</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://admin.ejemplo.com"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Hosting y Dominio */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Hosting y Dominio</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="hosting_provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor de Hosting</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: AWS, DigitalOcean, Vercel"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hosting_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan de Hosting</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Professional, Business"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hosting_renewal_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha Renovación Hosting</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domain_registrar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registrador de Dominio</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: GoDaddy, Namecheap"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domain_expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha Vencimiento Dominio</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ssl_certificate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificado SSL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Let's Encrypt, Cloudflare"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ssl_expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha Vencimiento SSL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>Fecha de vencimiento del certificado SSL</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cdn_provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor CDN</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Cloudflare, CloudFront"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Base de Datos */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Base de Datos</h3>
          
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="database_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Base de Datos</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: PostgreSQL, MySQL, MongoDB"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="database_host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host de Base de Datos</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: db.example.com"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="database_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de Base de Datos</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: production_db"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Repositorio */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Repositorio</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="repository_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Repositorio</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://github.com/usuario/repositorio"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="repository_branch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rama Principal</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="main"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Tecnologías */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Tecnologías</h3>
          
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="frontend_tech"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frontend</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Next.js, React, Vue"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="backend_tech"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Backend</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Node.js, Python, Laravel"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobile_tech"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: React Native, Flutter"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notas Adicionales</h3>
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Información adicional relevante..."
                    rows={4}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <LoadingButton type="submit" loading={isSubmitting} loadingText={application ? 'Actualizando aplicación...' : 'Creando aplicación...'}>
            {application ? 'Actualizar' : 'Crear'} Aplicación
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
