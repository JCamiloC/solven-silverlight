"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ClientSearchCombobox } from '@/components/ui/client-search-combobox'
import { useClients } from '@/hooks/use-clients'
import { useAssignableUsers } from '@/hooks/use-users'
import { useCreateTicket, useUpdateTicket } from '@/hooks/use-tickets'
import { useAuth } from '@/hooks/use-auth'
import { useHardwareAssetsByClient } from '@/hooks/use-hardware'
import { useSoftwareByClient } from '@/hooks/use-software'
import { useCustomApplicationsByClient } from '@/hooks/use-custom-applications'
import { useAccessCredentialsByClient } from '@/hooks/use-access-credentials'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle, Upload, X } from 'lucide-react'

const ticketFormSchema = z.object({
  client_id: z.string().min(1, 'Cliente es obligatorio'),
  title: z.string()
    .min(5, 'El asunto debe tener al menos 5 caracteres')
    .max(200, 'El asunto no puede exceder 200 caracteres'),
  description: z.string()
    .min(20, 'La solicitud debe tener al menos 20 caracteres')
    .max(2000, 'La solicitud no puede exceder 2000 caracteres'),
  contact_email: z.string()
    .email('Email inválido')
    .min(1, 'Email de contacto es obligatorio'),
  usuario_afectado: z.string()
    .min(1, 'Usuario afectado es obligatorio')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  category: z.enum(['hardware', 'software', 'network', 'access', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'pendiente_confirmacion', 'solucionado']).optional(),
  assigned_to: z.string().optional(),
  created_at: z.string().optional(), // Campo de fecha de creación personalizada
  created_at_time: z.string().optional(), // Campo de hora opcional
  // Campos relacionados (solo uno puede estar lleno según categoría)
  hardware_id: z.string().optional(),
  software_id: z.string().optional(),
  software_source: z.enum(['license', 'custom_app']).optional(),
  access_credential_id: z.string().optional(),
})

type TicketFormValues = z.infer<typeof ticketFormSchema>

interface TicketFormProps {
  mode?: 'create' | 'edit'
  ticketId?: string
  initialData?: Partial<TicketFormValues>
  clientId?: string
  clientName?: string
  onSuccess?: (ticketId: string) => void
  redirectUrl?: string
}

const categoryLabels = {
  hardware: 'Hardware',
  software: 'Software',
  access: 'Accesos',
  other: 'Otro',
}

const priorityLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
}

const statusLabels = {
  open: 'Abierto',
  pendiente_confirmacion: 'Pendiente Confirmación',
  solucionado: 'Solucionado',
}

export function TicketForm({ 
  mode = 'create',
  ticketId,
  initialData,
  clientId, 
  clientName, 
  onSuccess, 
  redirectUrl 
}: TicketFormProps) {
  const router = useRouter()
  const { user, isAdmin, isLeader, isSupport } = useAuth()
  const { data: clients, isLoading: loadingClients } = useClients()
  const { data: assignableUsers, isLoading: loadingUsers } = useAssignableUsers()
  const createTicket = useCreateTicket()
  const updateTicket = useUpdateTicket()

  const isClientLocked = !!clientId
  const isEditMode = mode === 'edit'
  const canChangeStatus = isAdmin() || isLeader() || isSupport()
  const isClient = useAuth().isClient
  
  // Estado para mostrar error y archivo
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: initialData || {
      client_id: clientId || '',
      title: '',
      description: '',
      contact_email: user?.email || '',
      usuario_afectado: '',
      category: 'other',
      priority: 'medium',
      status: 'open',
      assigned_to: undefined,
      hardware_id: undefined,
      software_id: undefined,
      software_source: undefined,
      access_credential_id: undefined,
    },
  })

  // Watchear cliente y categoría seleccionados
  const selectedClientId = form.watch('client_id')
  const selectedCategory = form.watch('category')
  
  // Obtener datos según categoría y cliente
  const { data: hardwareList, isLoading: loadingHardware } = useHardwareAssetsByClient(selectedClientId || '')
  const { data: softwareList, isLoading: loadingSoftware } = useSoftwareByClient(selectedClientId || '')
  const { data: customApplicationsList, isLoading: loadingCustomApplications } = useCustomApplicationsByClient(selectedClientId || '')
  const { data: accessList, isLoading: loadingAccess } = useAccessCredentialsByClient(selectedClientId || '')

  const softwareOptions = [
    ...(softwareList?.map((sw) => ({
      value: `license:${sw.id}`,
      label: `${sw.name} ${sw.version} - ${sw.license_type}`,
    })) || []),
    ...(customApplicationsList?.map((app) => ({
      value: `custom_app:${app.id}`,
      label: `${app.name} - Aplicativo`,
    })) || []),
  ]
  
  // Función para manejar selección de archivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('El archivo no puede superar los 5MB')
      return
    }
    
    setSelectedFile(file)
    setErrorMessage(null)
  }
  
  // Función para remover archivo seleccionado
  const handleRemoveFile = () => {
    setSelectedFile(null)
  }

  // Actualizar client_id si cambia el prop
  useEffect(() => {
    if (clientId) {
      form.setValue('client_id', clientId)
    }
  }, [clientId, form])

  // Cargar datos iniciales en modo edición
  useEffect(() => {
    if (isEditMode && initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        form.setValue(key as keyof TicketFormValues, value)
      })
    }
  }, [isEditMode, initialData, form])

  const onSubmit = async (data: TicketFormValues) => {
    if (!user?.id) return

    // Limpiar error previo
    setErrorMessage(null)

    try {
      // 1. Subir archivo si existe
      let attachmentData: { url?: string; name?: string; size?: number } = {}
      if (selectedFile) {
        setIsUploading(true)
        const supabase = createClient()
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        console.log('📤 Intentando subir archivo:', { fileName, size: selectedFile.size, type: selectedFile.type })
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: false
          })
        
        console.log('📤 Resultado de subida:', { uploadData, uploadError })

        if (uploadError) {
          throw new Error(`Error al subir archivo: ${uploadError.message}`)
        }

        // Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(fileName)

        attachmentData = {
          url: publicUrl,
          name: selectedFile.name,
          size: selectedFile.size
        }
        setIsUploading(false)
      }
      if (isEditMode && ticketId) {
        // Modo edición
        const updates: any = {
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          assigned_to: data.assigned_to || undefined,
        }

        // Solo permitir cambiar estado si tiene permisos
        if (canChangeStatus && data.status) {
          updates.status = data.status
          // Si se marca como solucionado, agregar timestamp
          if (data.status === 'solucionado') {
            updates.resolved_at = new Date().toISOString()
          }
        }

        const updatedTicket = await updateTicket.mutateAsync({
          id: ticketId,
          data: updates,
        })

        // Callback personalizado o redirección
        if (onSuccess) {
          onSuccess(updatedTicket.id)
        } else if (redirectUrl) {
          router.push(redirectUrl)
        } else {
          router.push('/dashboard/tickets')
        }
      } else {
        // Modo creación
        const ticketData: any = {
          client_id: data.client_id,
          title: data.title,
          description: data.description,
          contact_email: data.contact_email,
          usuario_afectado: data.usuario_afectado,
          category: data.category,
          priority: data.priority,
          status: 'open' as const, // Siempre crear como "open"
          assigned_to: data.assigned_to || undefined,
          created_by: user.id,
          // Campos relacionados según categoría
          hardware_id: data.category === 'hardware' && data.hardware_id !== 'other' ? data.hardware_id : undefined,
          software_id: data.category === 'software' && data.software_id !== 'other' ? data.software_id : undefined,
          software_source: data.category === 'software' && data.software_id !== 'other' ? data.software_source : undefined,
          access_credential_id: data.category === 'access' && data.access_credential_id !== 'other' ? data.access_credential_id : undefined,
          // Datos del archivo adjunto
          attachment_url: attachmentData.url,
          attachment_name: attachmentData.name,
          attachment_size: attachmentData.size,
        }

        // Si se especificó una fecha de creación personalizada, agregarla
        if (data.created_at) {
          // Si también se especificó hora, combinarlas; si no, usar 00:00
          const timeStr = data.created_at_time || '00:00'
          // Formato: YYYY-MM-DDTHH:mm:ss.000Z
          ticketData.created_at = new Date(data.created_at + 'T' + timeStr + ':00.000Z').toISOString()
        }
        
        // Log para diagnóstico
        console.log('🎫 Creando ticket con datos:', ticketData)
        console.log('👤 Usuario actual:', { id: user.id, email: user.email })
        
        const newTicket = await createTicket.mutateAsync(ticketData)

        // Callback personalizado o redirección
        if (onSuccess) {
          onSuccess(newTicket.id)
        } else if (redirectUrl) {
          router.push(redirectUrl)
        } else {
          router.push('/dashboard/tickets')
        }
      }
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} ticket:`, error)
      
      // Resetear estado de React Query
      if (isEditMode) {
        updateTicket.reset()
      } else {
        createTicket.reset()
      }
      
      // Mostrar mensaje de error al usuario
      const errorMsg = error?.message || 'Ocurrió un error al procesar el ticket'
      setErrorMessage(errorMsg)
      
      // Scroll al inicio para ver el error
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Mensaje de Error */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Información del Ticket */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Ticket</CardTitle>
            <CardDescription>
              {isEditMode 
                ? 'Modifica los detalles del ticket de soporte'
                : 'Complete los detalles del ticket de soporte'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cliente */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    {isClientLocked ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={clientName || 'Cliente'}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    ) : (
                      <ClientSearchCombobox
                        options={clients?.map((client) => ({
                          value: client.id,
                          label: client.name,
                        })) || []}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Seleccione un cliente"
                        searchPlaceholder="Buscar cliente..."
                        emptyMessage="No se encontraron clientes"
                        disabled={loadingClients}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Asunto */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asunto *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Breve descripción del problema" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Solicitud/Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solicitud *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describa detalladamente su solicitud o problema..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email de Contacto */}
            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de Contacto *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="email"
                      placeholder="correo@ejemplo.com" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Usuario Afectado */}
            <FormField
              control={form.control}
              name="usuario_afectado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario Afectado *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="text"
                      placeholder="Nombre del usuario que reporta el problema" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha y Hora de Creación (opcional) */}
            {!isEditMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="created_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Creación (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date"
                          placeholder="Dejar vacío para usar fecha actual"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Dejar vacío para usar fecha actual
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="created_at_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="time"
                          placeholder="00:00"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Dejar vacío para usar 00:00
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Categoría, Prioridad y Estado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Categoría */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prioridad */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione prioridad" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(priorityLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estado (solo en modo edición y con permisos) */}
              {isEditMode && canChangeStatus && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado *</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione estado" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Selector dinámico según categoría */}
            {selectedCategory === 'hardware' && selectedClientId && (
              <FormField
                control={form.control}
                name="hardware_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipo de Hardware</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingHardware}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingHardware ? "Cargando..." : "Seleccione un equipo"} />
                        </SelectTrigger>
                        <SelectContent>
                          {hardwareList?.map((hw) => (
                            <SelectItem key={hw.id} value={hw.id}>
                              {hw.type} - {hw.brand} {hw.model} (S/N: {hw.serial_number})
                            </SelectItem>
                          ))}
                          <SelectItem value="other">Otro (no está en la lista)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedCategory === 'software' && selectedClientId && (
              <FormField
                control={form.control}
                name="software_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Software</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          if (value === 'other') {
                            field.onChange('other')
                            form.setValue('software_source', undefined)
                            return
                          }

                          const [source, id] = value.split(':')
                          if (!id || (source !== 'license' && source !== 'custom_app')) {
                            return
                          }

                          field.onChange(id)
                          form.setValue('software_source', source as 'license' | 'custom_app')
                        }}
                        value={
                          field.value === 'other'
                            ? 'other'
                            : field.value && form.watch('software_source')
                              ? `${form.watch('software_source')}:${field.value}`
                              : undefined
                        }
                        disabled={loadingSoftware || loadingCustomApplications}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={(loadingSoftware || loadingCustomApplications) ? "Cargando..." : "Seleccione software o aplicativo"} />
                        </SelectTrigger>
                        <SelectContent>
                          {softwareOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="other">Otro (no está en la lista)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedCategory === 'access' && selectedClientId && (
              <FormField
                control={form.control}
                name="access_credential_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credencial de Acceso</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingAccess}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingAccess ? "Cargando..." : "Seleccione una credencial"} />
                        </SelectTrigger>
                        <SelectContent>
                          {accessList?.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.system_name} - {acc.username}
                            </SelectItem>
                          ))}
                          <SelectItem value="other">Otro (no está en la lista)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Archivo adjunto */}
            <div className="space-y-2">
              <Label htmlFor="attachment">Archivo Adjunto (opcional)</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                {!selectedFile ? (
                  <div className="flex-1 w-full">
                    <Input
                      id="attachment"
                      type="file"
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      disabled={isUploading}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Máximo 5MB. Formatos: imágenes, PDF, Word, Excel, texto, ZIP
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 w-full flex items-center gap-2 p-2 border rounded-md bg-muted">
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                      disabled={isUploading}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Asignar a (opcional) - Solo para admin/soporte */}
            {!isClient() && (
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asignar a (opcional)</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value === 'unassigned' ? undefined : value)
                        }}
                        defaultValue={field.value || 'unassigned'}
                        disabled={loadingUsers}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Sin asignar</SelectItem>
                          {assignableUsers?.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.first_name} {user.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createTicket.isPending || updateTicket.isPending}
            className="w-full sm:w-auto"
          >
            {(createTicket.isPending || updateTicket.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditMode 
              ? (updateTicket.isPending ? 'Actualizando...' : 'Actualizar Ticket')
              : (createTicket.isPending ? 'Creando...' : 'Crear Ticket')
            }
          </Button>
        </div>
      </form>
    </Form>
  )
}
