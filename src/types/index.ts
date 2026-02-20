export type UserRole = 'cliente' | 'agente_soporte' | 'lider_soporte' | 'administrador'

export type ClientType = 
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
  nit?: string
  mantenimientos_al_anio?: number
  client_type?: ClientType
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
  sede?: string
  area_encargada?: string
  persona_responsable?: string
  correo_responsable?: string
  procesador?: string
  memoria_ram?: string
  disco_duro?: string
  sistema_operativo?: any
  ms_office?: any
  antivirus?: any
  software_extra?: any[]
  mouse?: boolean
  mouse_serial?: string
  diadema?: boolean
  diadema_serial?: string
  teclado?: boolean
  teclado_serial?: string
  otro_periferico?: string
  observaciones?: string
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

export type TipoSeguimiento = 
  | 'mantenimiento_programado'
  | 'mantenimiento_no_programado'
  | 'soporte_remoto'
  | 'soporte_en_sitio'

export interface HardwareSeguimiento {
  id: string
  hardware_id: string
  tipo: TipoSeguimiento
  detalle: string
  actividades?: string[]
  foto_url?: string
  fecha_registro: string
  creado_por?: string
  created_at: string
  updated_at: string
  creator?: Profile
  hardware?: HardwareAsset
}

export interface HardwareUpgrade {
  id: string
  hardware_id: string
  // Valores anteriores
  previous_procesador?: string
  previous_memoria_ram?: string
  previous_disco_duro?: string
  // Valores nuevos
  new_procesador?: string
  new_memoria_ram?: string
  new_disco_duro?: string
  // Campos cambiados
  changed_fields: string[]
  // Auditoría
  updated_by?: string
  update_reason?: string
  notes?: string
  created_at: string
  // Relaciones opcionales
  updater?: {
    first_name: string
    last_name: string
    email: string
  }
}

export interface SoftwareLicense {
  id: string
  client_id: string
  name: string
  vendor: string
  version: string
  license_key: string
  license_type: 'perpetual' | 'subscription' | 'oem'
  periodicidad?: 'mensual' | 'anual'
  seats: number
  purchase_date?: string // Opcional para mantener compatibilidad
  expiry_date?: string
  cost?: number // Opcional para mantener compatibilidad
  status: 'active' | 'expired' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface MaintenanceReportFilters {
  reportType: 'hardware' | 'software' | 'accesos'
  clientId: string
  year: number
  month: number
}

export interface MaintenanceReportRow {
  rowNumber: number
  usuario: string
  equipoNombre: string
  tipo: string
  procesador: string
  ram: string
  disco: string
  tipoPantalla: string
  office: string
  antivirus: string
  sistemaOperativo: string
  detalleSeguimiento: string
  fechaSeguimiento: string
}

export interface CustomApplication {
  id: string
  client_id: string
  // Información Básica
  name: string
  description?: string
  status: 'active' | 'development' | 'maintenance' | 'inactive'
  // URLs y Accesos
  production_url?: string
  staging_url?: string
  development_url?: string
  admin_panel_url?: string
  // Hosting
  hosting_provider?: string
  hosting_plan?: string
  hosting_renewal_date?: string
  // Dominio
  domain_registrar?: string
  domain_expiry_date?: string
  // Base de Datos
  database_type?: string
  database_name?: string
  database_host?: string
  // Repositorio
  repository_url?: string
  repository_branch?: string
  // Tecnologías
  frontend_tech?: string
  backend_tech?: string
  mobile_tech?: string
  // Additional
  ssl_certificate?: string
  ssl_expiry_date?: string
  cdn_provider?: string
  // Notas
  notes?: string
  // Metadatos
  created_at: string
  updated_at: string
  clients?: {
    name: string
  }
}

export interface CustomAppFollowup {
  id: string
  application_id: string
  fecha_registro: string
  tipo: 'actualizacion' | 'mantenimiento' | 'soporte' | 'backup' | 'migracion' | 'optimizacion' | 'bug_fix' | 'nueva_funcionalidad' | 'otro'
  actividades: string[]
  detalle: string
  foto_url?: string
  tecnico_responsable: string
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
  ticket_number: string
  client_id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'pendiente_confirmacion' | 'resolved' | 'closed'
  category: 'hardware' | 'software' | 'network' | 'access' | 'other'
  software_source?: 'license' | 'custom_app'
  assigned_to?: string
  created_by: string
  usuario_afectado?: string
  resolved_at?: string
  tiempo_respuesta?: string
  tiempo_solucion?: string
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