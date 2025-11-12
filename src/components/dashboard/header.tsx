'use client'

import { useState, useEffect } from 'react'
import { Bell, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MobileSidebar } from './mobile-sidebar'
import { useSidebar } from './sidebar-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { usePageTitle } from '@/hooks/use-page-title'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  // Ya no necesitamos title como prop
}

export function Header({}: HeaderProps) {
  const [notifications] = useState(0) // Real notification count will be implemented later
  const [mounted, setMounted] = useState(false)
  const { profile, signOut } = useAuth()
  const title = usePageTitle() // Obtener título dinámico basado en la ruta
  const router = useRouter()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getUserInitials = () => {
    if (!profile) return 'U'
    return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
  }

  const getRoleDisplay = () => {
    if (!profile) return 'Usuario'
    const roleMap = {
      administrador: 'Administrador',
      lider_soporte: 'Líder de Soporte',
      agente_soporte: 'Agente de Soporte',
      cliente: 'Cliente',
    }
    return roleMap[profile.role] || profile.role
  }

  const { toggleSidebar } = useSidebar()

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <MobileSidebar />
          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden md:flex mr-2"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold ml-2 md:ml-0 truncate">{title}</h1>
        </div>
        
        <div className="flex flex-1 items-center justify-end ml-4">
          {/* Right side items */}
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
                >
                  {notifications}
                </Badge>
              )}
            </Button>
            
            {/* User menu */}
            {!mounted ? (
              <Button variant="ghost" className="relative h-8 w-8 rounded-full" disabled>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url} alt="Usuario" />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile ? `${profile.first_name} ${profile.last_name}` : 'Usuario'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {getRoleDisplay()}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/dashboard/configuracion')}>
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}