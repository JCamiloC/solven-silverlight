'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { UnderConstruction } from '@/components/ui/under-construction'

export default function ReportsPage() {
  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
      <UnderConstruction 
        moduleName="Reportes y Análisis"
        description="Reportes personalizados, dashboards y análisis de datos"
      />
    </ProtectedRoute>
  )
}