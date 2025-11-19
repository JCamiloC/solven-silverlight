'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { 
  Plus, 
  FileText, 
  Download, 
  Settings,
  Ticket,
  HardDrive,
  Monitor,
  Key
} from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  const { hasRole } = useAuth()

  const clientActions = [
    {
      title: 'Crear Ticket',
      description: 'Crear nuevo ticket de soporte',
      icon: Ticket,
      href: '/dashboard/tickets/new',
      variant: 'default' as const,
    },
    {
      title: 'Ver Mis Tickets',
      description: 'Ver todos mis tickets',
      icon: FileText,
      href: '/dashboard/tickets',
      variant: 'outline' as const,
    },
    {
      title: 'Descargar Reportes',
      description: 'Descargar reportes del sistema',
      icon: Download,
      href: '/dashboard/reportes',
      variant: 'outline' as const,
    },
  ]

  const supportActions = [
    {
      title: 'Agregar Hardware',
      description: 'Registrar nuevo equipo',
      icon: HardDrive,
      href: '/dashboard/hardware',
      variant: 'default' as const,
    },
    {
      title: 'Gestionar Software',
      description: 'Administrar licencias',
      icon: Monitor,
      href: '/dashboard/software',
      variant: 'outline' as const,
    },
    {
      title: 'Configurar Accesos',
      description: 'Gestionar credenciales',
      icon: Key,
      href: '/dashboard/accesos',
      variant: 'outline' as const,
    },
  ]

  const adminActions = [
    {
      title: 'Configuración',
      description: 'Configurar el sistema',
      icon: Settings,
      href: '/dashboard/configuracion',
      variant: 'default' as const,
    },
    {
      title: 'Generar Reportes',
      description: 'Crear reportes avanzados',
      icon: FileText,
      href: '/dashboard/reportes',
      variant: 'outline' as const,
    },
    {
      title: 'Gestión de Usuarios',
      description: 'Administrar usuarios',
      icon: Plus,
      href: '/dashboard/usuarios',
      variant: 'outline' as const,
    },
  ]

  const getActions = () => {
    if (hasRole(['administrador'])) {
      return [...supportActions, ...adminActions]
    }
    if (hasRole(['lider_soporte']) || hasRole(['agente_soporte'])) {
      return [...supportActions, ...clientActions.slice(1)] // Exclude "Create Ticket" for support
    }
    return clientActions
  }

  const actions = getActions()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones Rápidas</CardTitle>
        <CardDescription>
          Accesos directos a las funciones más utilizadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.title}
                variant={action.variant}
                className="h-auto p-4 justify-start"
                asChild
              >
                <Link href={action.href}>
                  <div className="flex items-start space-x-3">
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-medium">{action.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}