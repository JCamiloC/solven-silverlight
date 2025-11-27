'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { useSidebar } from './sidebar-context'
import { 
  LayoutDashboard, 
  Building2,
  BarChart3, 
  Ticket,
  Users,
  Settings,
  LogOut
} from 'lucide-react'
import { SidebarLogo } from '@/components/ui/logo'
import { LucideIcon } from 'lucide-react'

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  roles: string[]
}

interface NavButtonProps {
  item: NavigationItem
  isActive: boolean
  showText: boolean
  isCollapsed: boolean
  isHovered: boolean
  onNavigate?: () => void
}

const NavButton = ({ item, isActive, showText, isCollapsed, isHovered, onNavigate }: NavButtonProps) => {
  const button = (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className={cn(
        'w-full sidebar-button',
        showText ? 'justify-start' : 'justify-center',
        isActive && 'bg-secondary',
        !showText && 'px-1'
      )}
      asChild
    >
      <Link href={item.href} onClick={onNavigate}>
        <item.icon className={cn('h-4 w-4', showText && 'mr-2')} />
        {showText && item.name}
      </Link>
    </Button>
  )

  if (isCollapsed && !isHovered) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}

const allNavigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['administrador', 'lider_soporte', 'agente_soporte'],
  },
  {
    name: 'Clientes',
    href: '/dashboard/clientes',
    icon: Building2,
    roles: ['administrador', 'lider_soporte', 'agente_soporte'],
  },
  {
    name: 'Reportes',
    href: '/dashboard/reportes',
    icon: BarChart3,
    roles: ['administrador', 'lider_soporte'],
  },
  {
    name: 'Parámetros',
    href: '/dashboard/parametros',
    icon: Settings,
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

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const { isCollapsed, isHovered, setIsHovered } = useSidebar()

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

  const showText = !isCollapsed || isHovered
  const sidebarWidth = isCollapsed && !isHovered ? 'w-20' : 'w-64'

  return (
    <div 
      className={cn('transition-all duration-300 overflow-x-hidden flex flex-col h-full', sidebarWidth, className)}
      onMouseEnter={() => isCollapsed && setIsHovered(true)}
      onMouseLeave={() => isCollapsed && setIsHovered(false)}
    >
      {/* Top Section - Logo */}
      <div className={showText ? "px-3 py-4 flex-shrink-0" : "px-1 py-4 flex-shrink-0"}>
        {showText ? (
          <SidebarLogo />
        ) : (
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: '#24add6' }}>
              <span className="text-white font-bold text-lg">S</span>
            </div>
          </div>
        )}
      </div>

      {/* Middle Section - Main Navigation (Centered Vertically) */}
      <div className={`flex-1 flex flex-col justify-center ${showText ? 'px-3' : 'px-1'}`}>
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavButton
              key={item.name}
              item={item}
              isActive={pathname === item.href}
              showText={showText}
              isCollapsed={isCollapsed}
              isHovered={isHovered}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
      
      {/* Bottom Section - Settings & Logout */}
      <div className={`py-4 flex-shrink-0 border-t border-border/50 ${showText ? 'px-3' : 'px-1'}`}>
        <div className="space-y-1">
          {(profile?.role === 'administrador' || profile?.role === 'lider_soporte') && (
            <NavButton
              item={{
                name: 'Configuración',
                href: '/dashboard/configuracion',
                icon: Settings,
                roles: ['administrador', 'lider_soporte']
              }}
              isActive={pathname === '/dashboard/configuracion'}
              showText={showText}
              isCollapsed={isCollapsed}
              isHovered={isHovered}
              onNavigate={onNavigate}
            />
          )}
          
          {/* Logout button with tooltip when collapsed */}
          {isCollapsed && !isHovered ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-center px-1 sidebar-button"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Cerrar Sesión</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button 
              variant="ghost" 
              className="w-full justify-start sidebar-button"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}