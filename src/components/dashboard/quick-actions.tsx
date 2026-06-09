'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { 
  FileText, 
  Settings,
  Ticket,
  Building2,
} from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  const { hasRole, profile } = useAuth()

  const clientActions = [
    {
      title: 'Crear Ticket',
      description: 'Crear nuevo ticket de soporte',
      icon: Ticket,
      href: profile?.client_id
        ? `/dashboard/tickets/nuevo?clientId=${profile.client_id}`
        : '/dashboard/tickets/nuevo',
      variant: 'default' as const,
    },
    {
      title: 'Ver Mis Tickets',
      description: 'Ver todos mis tickets',
      icon: FileText,
      href: profile?.client_id
        ? `/dashboard/clientes/${profile.client_id}/tickets`
        : '/dashboard/tickets',
      variant: 'outline' as const,
    },
  ]

  const supportActions = [
    {
      title: 'Clientes',
      description: 'Gestionar clientes y sus módulos',
      icon: Building2,
      href: '/dashboard/clientes',
      variant: 'default' as const,
    },
    {
      title: 'Tickets',
      description: 'Ver y gestionar tickets',
      icon: Ticket,
      href: '/dashboard/tickets',
      variant: 'outline' as const,
    },
    {
      title: 'Reportes',
      description: 'Generar reportes del sistema',
      icon: FileText,
      href: '/dashboard/reportes',
      variant: 'outline' as const,
    },
  ]

  const adminActions = [
    {
      title: 'Configuración',
      description: 'Configurar el sistema',
      icon: Settings,
      href: '/dashboard/configuracion',
      variant: 'outline' as const,
    },
    {
      title: 'Gestión de Usuarios',
      description: 'Administrar usuarios',
      icon: Ticket,
      href: '/dashboard/usuarios',
      variant: 'outline' as const,
    },
  ]

  const getActions = () => {
    if (hasRole(['administrador', 'lider_soporte'])) {
      return [...supportActions, ...adminActions]
    }
    if (hasRole(['agente_soporte'])) {
      return supportActions
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
