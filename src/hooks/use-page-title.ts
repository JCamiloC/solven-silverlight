'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/hardware': 'Hardware',
  '/dashboard/clientes': 'Clientes',
  '/dashboard/software': 'Software',
  '/dashboard/accesos': 'Accesos',
  '/dashboard/reportes': 'Reportes',
  '/dashboard/usuarios': 'Usuarios',
  '/dashboard/tickets': 'Tickets',
  '/dashboard/configuracion': 'Configuración',
}

export function usePageTitle() {
  const pathname = usePathname()
  
  // Buscar título exacto primero
  if (pageTitles[pathname]) {
    return pageTitles[pathname]
  }
  
  // Buscar por coincidencia parcial para rutas anidadas (ej: /dashboard/tickets/123)
  const matchingRoute = Object.keys(pageTitles).find(route => 
    pathname.startsWith(route) && route !== '/dashboard'
  )
  
  if (matchingRoute) {
    return pageTitles[matchingRoute]
  }
  
  // Por defecto retornar Dashboard
  return 'Dashboard'
}