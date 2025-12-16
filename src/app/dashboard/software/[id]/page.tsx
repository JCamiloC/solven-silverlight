'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useCustomApplications } from '@/hooks/use-custom-applications'
import { CustomAppForm } from '@/components/custom-apps'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Globe,
  Server,
  Database,
  Code,
  Calendar,
  Shield,
  Cloud,
  GitBranch,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const statusConfig = {
  active: { label: 'Activo', variant: 'default' as const, color: 'bg-green-500' },
  maintenance: { label: 'Mantenimiento', variant: 'secondary' as const, color: 'bg-yellow-500' },
  inactive: { label: 'Inactivo', variant: 'outline' as const, color: 'bg-gray-500' },
  development: { label: 'Desarrollo', variant: 'secondary' as const, color: 'bg-blue-500' },
}

export default function SoftwareDetailPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params.id as string

  const { data: applications, isLoading } = useCustomApplications()
  const application = applications?.find(app => app.id === applicationId)

  const [editDialogOpen, setEditDialogOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!application) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground">Aplicación no encontrada</p>
        <Button onClick={() => router.push('/dashboard/software')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Software
        </Button>
      </div>
    )
  }

  const status = statusConfig[application.status as keyof typeof statusConfig]

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/software')}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Software
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {application.name}
                </h1>
                <Badge variant={status.variant}>
                  <div className={`w-2 h-2 rounded-full ${status.color} mr-2`} />
                  {status.label}
                </Badge>
              </div>
              {application.clients?.name && (
                <p className="text-muted-foreground">
                  Cliente: {application.clients.name}
                </p>
              )}
              {application.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {application.description}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/software/${applicationId}/seguimientos`)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Seguimientos
              </Button>
            </div>
          </div>
        </div>

        {/* URLs Section */}
        {(application.production_url || application.staging_url || application.development_url || application.admin_panel_url) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                URLs y Accesos
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {application.production_url && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Producción</p>
                  <a
                    href={application.production_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {application.production_url}
                    <Globe className="h-3 w-3" />
                  </a>
                </div>
              )}
              {application.staging_url && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Staging</p>
                  <a
                    href={application.staging_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {application.staging_url}
                    <Globe className="h-3 w-3" />
                  </a>
                </div>
              )}
              {application.development_url && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Desarrollo</p>
                  <p className="text-sm">{application.development_url}</p>
                </div>
              )}
              {application.admin_panel_url && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Panel Admin</p>
                  <a
                    href={application.admin_panel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {application.admin_panel_url}
                    <Globe className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Hosting & Domain */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Hosting y Dominio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.hosting_provider && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Proveedor</p>
                  <p className="text-sm">{application.hosting_provider}</p>
                </div>
              )}
              {application.hosting_plan && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Plan</p>
                  <p className="text-sm">{application.hosting_plan}</p>
                </div>
              )}
              {application.hosting_renewal_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Renovación Hosting
                  </p>
                  <p className="text-sm">
                    {format(new Date(application.hosting_renewal_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              )}
              {application.domain_registrar && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Registrador de Dominio
                  </p>
                  <p className="text-sm">{application.domain_registrar}</p>
                </div>
              )}
              {application.domain_expiry_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Vencimiento Dominio
                  </p>
                  <p className="text-sm">
                    {format(new Date(application.domain_expiry_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              )}
              {application.ssl_certificate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Certificado SSL
                  </p>
                  <p className="text-sm">{application.ssl_certificate}</p>
                </div>
              )}
              {application.ssl_expiry_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Vencimiento SSL
                  </p>
                  <p className="text-sm">
                    {format(new Date(application.ssl_expiry_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              )}
              {application.cdn_provider && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Proveedor CDN</p>
                  <p className="text-sm">{application.cdn_provider}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Database */}
          {(application.database_type || application.database_host || application.database_name) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Base de Datos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.database_type && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Tipo</p>
                    <p className="text-sm">{application.database_type}</p>
                  </div>
                )}
                {application.database_host && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Host</p>
                    <p className="text-sm">{application.database_host}</p>
                  </div>
                )}
                {application.database_name && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Nombre</p>
                    <p className="text-sm">{application.database_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Repository */}
          {(application.repository_url || application.repository_branch) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Repositorio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.repository_url && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">URL</p>
                    <a
                      href={application.repository_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {application.repository_url}
                    </a>
                  </div>
                )}
                {application.repository_branch && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Rama Principal</p>
                    <p className="text-sm">{application.repository_branch}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Technologies */}
          {(application.frontend_tech || application.backend_tech || application.mobile_tech) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Tecnologías
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.frontend_tech && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Frontend</p>
                    <p className="text-sm">{application.frontend_tech}</p>
                  </div>
                )}
                {application.backend_tech && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Backend</p>
                    <p className="text-sm">{application.backend_tech}</p>
                  </div>
                )}
                {application.mobile_tech && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Mobile</p>
                    <p className="text-sm">{application.mobile_tech}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Notes */}
        {application.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notas Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{application.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Aplicación</DialogTitle>
              <DialogDescription>
                Actualiza la información de la aplicación
              </DialogDescription>
            </DialogHeader>
            <CustomAppForm
              application={application}
              onSuccess={() => setEditDialogOpen(false)}
              onCancel={() => setEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
