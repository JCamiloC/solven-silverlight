'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { UnderConstruction } from '@/components/ui/under-construction'

export default function SoftwarePage() {
  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <UnderConstruction 
        moduleName="Gestión de Software"
        description="Control de licencias, instalaciones y versiones de software"
      />
    </ProtectedRoute>
  )
}
