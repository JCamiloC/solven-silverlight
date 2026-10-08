import type { UserRole } from '@/types'

/** Admin y líder ven y gestionan todas las empresas (clientes). */
export function hasFullClientCatalogAccess(role?: UserRole | null): boolean {
  return role === 'administrador' || role === 'lider_soporte'
}

export function canCreateClientCompany(role?: UserRole | null): boolean {
  return hasFullClientCatalogAccess(role)
}

export function canDeleteClientCompany(role?: UserRole | null): boolean {
  return hasFullClientCatalogAccess(role)
}

export function canAccessUsersSection(role?: UserRole | null): boolean {
  return hasFullClientCatalogAccess(role)
}

export function canManageUsers(role?: UserRole | null): boolean {
  return hasFullClientCatalogAccess(role)
}

/** Solo administrador puede eliminar cuentas. */
export function canDeleteUsers(role?: UserRole | null): boolean {
  return role === 'administrador'
}
