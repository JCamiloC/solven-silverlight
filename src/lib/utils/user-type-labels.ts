import { UserType } from '@/types'

export const getUserTypeLabel = (userType?: UserType): string => {
  if (!userType) return 'No definido'
  
  const labels: Record<UserType, string> = {
    'on_demand_software': 'On demand - Software',
    'on_demand_hardware': 'On demand - Hardware',
    'on_demand_ambos': 'On demand - Ambos',
    'contrato_software': 'Contrato - Software',
    'contrato_hardware': 'Contrato - Hardware',
    'contrato_ambos': 'Contrato - Ambos',
    'no_aplica': 'No Aplica',
  }
  
  return labels[userType] || userType
}

export const getUserTypeBadgeVariant = (userType?: UserType): 'default' | 'secondary' | 'outline' | 'destructive' => {
  if (!userType || userType === 'no_aplica') return 'outline'
  
  if (userType.includes('on_demand')) {
    return 'secondary'
  }
  
  if (userType.includes('contrato')) {
    return 'default'
  }
  
  return 'outline'
}

