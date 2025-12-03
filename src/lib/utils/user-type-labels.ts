import { ClientType } from '@/types'

export const getClientTypeLabel = (clientType?: ClientType): string => {
  if (!clientType) return 'No definido'
  
  const labels: Record<ClientType, string> = {
    'on_demand_software': 'On demand - Software',
    'on_demand_hardware': 'On demand - Hardware',
    'on_demand_ambos': 'On demand - Ambos',
    'contrato_software': 'Contrato - Software',
    'contrato_hardware': 'Contrato - Hardware',
    'contrato_ambos': 'Contrato - Ambos',
    'no_aplica': 'No Aplica',
  }
  
  return labels[clientType] || clientType
}

export const getClientTypeBadgeVariant = (clientType?: ClientType): 'default' | 'secondary' | 'outline' | 'destructive' => {
  if (!clientType || clientType === 'no_aplica') return 'outline'
  
  if (clientType.includes('on_demand')) {
    return 'secondary'
  }
  
  if (clientType.includes('contrato')) {
    return 'default'
  }
  
  return 'outline'
}

// Mantener compatibilidad con código existente (deprecated)
export const getUserTypeLabel = getClientTypeLabel
export const getUserTypeBadgeVariant = getClientTypeBadgeVariant

