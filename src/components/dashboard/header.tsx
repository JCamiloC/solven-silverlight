'use client'

import { useState, useEffect } from 'react'
import { Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ThemeSelector } from '@/components/ui/theme-selector'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'

interface HeaderProps {
  title?: string
}

export function Header({ title = 'Dashboard' }: HeaderProps) {
  const [notifications] = useState(0) // Real notification count will be implemented later
  const [mounted, setMounted] = useState(false)
  const { profile, signOut } = useAuth()

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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* Search */}
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="w-full pl-8 md:w-[300px] lg:w-[400px]"
              />
            </div>
          </div>
          
          {/* Right side items */}
          <div className="flex items-center space-x-2">
            {/* Theme selector */}
            <ThemeSelector />
            
            {/* Theme toggle */}
            <ThemeToggle />
            
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
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </DropdownMenuItem>
                  {(profile?.role === 'administrador' || profile?.role === 'lider_soporte') && (
                    <DropdownMenuItem>
                      Configuración
                    </DropdownMenuItem>
                  )}
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