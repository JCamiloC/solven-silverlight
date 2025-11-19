export type UserRole = 'cliente' | 'agente_soporte' | 'lider_soporte' | 'administrador'

export type UserType = 
  | 'on_demand_software'
  | 'on_demand_hardware'
  | 'on_demand_ambos'
  | 'contrato_software'
  | 'contrato_hardware'
  | 'contrato_ambos'
  | 'no_aplica'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string
  client_id?: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: UserRole
  user_type?: UserType
  avatar_url?: string
  totp_secret?: string
  totp_enabled?: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  contact_person: string
  created_at: string
  updated_at: string
}

export interface HardwareAsset {
  id: string
  client_id: string
  name: string
  type: string
  brand: string
  model: string
  serial_number: string
  specifications: Record<string, any>
  purchase_date: string
  warranty_expiry?: string
  status: 'active' | 'maintenance' | 'retired'
  location: string
  assigned_to?: string
  created_at: string
  updated_at: string
}

export interface MaintenanceLog {
  id: string
  asset_id: string
  type: 'preventive' | 'corrective' | 'inspection'
  description: string
  performed_by: string
  performed_at: string
  cost?: number
  notes?: string
  created_at: string
}

export interface SoftwareLicense {
  id: string
  client_id: string
  name: string
  vendor: string
  version: string
  license_key: string
  license_type: 'perpetual' | 'subscription' | 'oem'
  seats: number
  purchase_date: string
  expiry_date?: string
  cost: number
  status: 'active' | 'expired' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface AccessCredential {
  id: string
  client_id: string
  system_name: string
  username: string
  password_hash: string
  url?: string
  notes?: string
  created_by: string
  last_accessed?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface AccessLog {
  id: string
  credential_id: string
  accessed_by: string
  accessed_at: string
  purpose: string
  ip_address?: string
}

export interface Ticket {
  id: string
  client_id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
  category: 'hardware' | 'software' | 'network' | 'access' | 'other'
  assigned_to?: string
  created_by: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface TicketComment {
  id: string
  ticket_id: string
  comment: string
  created_by: string
  is_internal: boolean
  created_at: string
}

export interface Report {
  id: string
  client_id: string
  type: 'hardware_summary' | 'software_inventory' | 'ticket_summary' | 'maintenance_schedule'
  title: string
  description?: string
  data: Record<string, any>
  generated_by: string
  generated_at: string
}