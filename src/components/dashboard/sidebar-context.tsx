'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  isHovered: boolean
  setIsHovered: (hovered: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  // Iniciar colapsado por defecto si es cliente
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Colapsar automáticamente para clientes al cargar
  useEffect(() => {
    if (profile?.role === 'cliente') {
      setIsCollapsed(true)
    }
  }, [profile?.role])

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      toggleSidebar,
      isHovered,
      setIsHovered
    }}>
      <div suppressHydrationWarning>
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}