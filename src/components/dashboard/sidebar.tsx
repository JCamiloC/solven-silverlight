'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/use-auth'
import { 
  LayoutDashboard, 
  HardDrive, 
  Monitor, 
  Key, 
  BarChart3, 
  Ticket,
  Users,
  Settings,
  LogOut
} from 'lucide-react'
import { SidebarLogo } from '@/components/ui/logo'

interface SidebarProps {
  className?: string
}

const allNavigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['administrador', 'lider_soporte', 'agente_soporte'],
  },
  {
    name: 'Hardware',
    href: '/dashboard/hardware',
    icon: HardDrive,
    roles: ['administrador', 'lider_soporte', 'agente_soporte'],
  },
  {
    name: 'Software',
    href: '/dashboard/software',
    icon: Monitor,
    roles: ['administrador', 'lider_soporte', 'agente_soporte'],
  },
  {
    name: 'Accesos',
    href: '/dashboard/accesos',
    icon: Key,
    roles: ['administrador'],
  },
  {
    name: 'Reportes',
    href: '/dashboard/reportes',
    icon: BarChart3,
    roles: ['administrador', 'lider_soporte'],
  },
  {
    name: 'Usuarios',
    href: '/dashboard/usuarios',
    icon: Users,
    roles: ['administrador'],
  },
  {
    name: 'Tickets',
    href: '/dashboard/tickets',
    icon: Ticket,
    roles: ['administrador', 'lider_soporte', 'agente_soporte', 'cliente'],
  },
]

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  // Filter navigation items based on user role
  const navigation = allNavigationItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  )

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className={cn('pb-12 w-64', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <SidebarLogo />
          {profile && (
            <div className="mb-4 px-4">
              <p className="text-sm text-muted-foreground">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {profile.role.replace('_', ' ')}
              </p>
            </div>
          )}
          <div className="space-y-1">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  pathname === item.href && 'bg-secondary'
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="space-y-1">
            {(profile?.role === 'administrador' || profile?.role === 'lider_soporte') && (
              <Button 
                variant={pathname === '/dashboard/configuracion' ? 'secondary' : 'ghost'} 
                className={cn(
                  'w-full justify-start',
                  pathname === '/dashboard/configuracion' && 'bg-secondary'
                )}
                asChild
              >
                <Link href="/dashboard/configuracion">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </Link>
              </Button>
            )}
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}