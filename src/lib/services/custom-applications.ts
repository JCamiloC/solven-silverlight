import { createClient } from '@/lib/supabase/client'
import {
  CustomApplication,
  CustomAppFollowup,
  SoftwareDocument,
  SoftwareDocumentType,
  SoftwareMeeting,
  SoftwareMeetingItem,
  SoftwareMeetingItemStatus,
  SoftwareMeetingItemType,
  SoftwareMeetingType,
  SoftwarePhaseKey,
  SoftwarePhaseStatus,
  SoftwarePostsaleAdjustment,
  SoftwarePostsalePriority,
  SoftwarePostsaleStatus,
  SoftwareProjectPhase,
  SoftwareRelease,
  SoftwareReleaseEnvironment,
  SoftwareReleaseStatus,
} from '@/types'

const supabase = createClient()

// ===================================
// INTERFACES
// ===================================

export interface CustomApplicationInsert {
  client_id: string
  name: string
  description?: string | null
  status?: 'active' | 'development' | 'maintenance' | 'inactive'
  production_url?: string | null
  staging_url?: string | null
  development_url?: string | null
  admin_panel_url?: string | null
  hosting_provider?: string | null
  hosting_plan?: string | null
  hosting_renewal_date?: string | null
  domain_registrar?: string | null
  domain_expiry_date?: string | null
  database_type?: string | null
  database_host?: string | null
  database_name?: string | null
  repository_url?: string | null
  repository_branch?: string | null
  frontend_tech?: string | null
  backend_tech?: string | null
  mobile_tech?: string | null
  ssl_certificate?: string | null
  ssl_expiry_date?: string | null
  cdn_provider?: string | null
  notes?: string | null
}

export interface CustomApplicationUpdate {
  client_id?: string
  name?: string
  description?: string | null
  status?: 'active' | 'development' | 'maintenance' | 'inactive'
  production_url?: string | null
  staging_url?: string | null
  development_url?: string | null
  admin_panel_url?: string | null
  hosting_provider?: string | null
  hosting_plan?: string | null
  hosting_renewal_date?: string | null
  domain_registrar?: string | null
  domain_expiry_date?: string | null
  database_type?: string | null
  database_host?: string | null
  database_name?: string | null
  repository_url?: string | null
  repository_branch?: string | null
  frontend_tech?: string | null
  backend_tech?: string | null
  mobile_tech?: string | null
  ssl_certificate?: string | null
  ssl_expiry_date?: string | null
  cdn_provider?: string | null
  notes?: string | null
}

export interface CustomApplicationWithRelations extends CustomApplication {
  client?: {
    id: string
    name: string
  }
}

export interface CustomAppFollowupInsert {
  application_id: string
  fecha_registro: string
  tipo: 'actualizacion' | 'mantenimiento' | 'soporte' | 'backup' | 'migracion' | 'optimizacion' | 'bug_fix' | 'nueva_funcionalidad' | 'otro'
  actividades: string[]
  detalle: string
  foto_url?: string
  tecnico_responsable: string
}

export interface SoftwareProjectPhaseInsert {
  application_id: string
  phase_key: SoftwarePhaseKey
  title: string
  status?: SoftwarePhaseStatus
  planned_start_date?: string | null
  planned_end_date?: string | null
  actual_start_date?: string | null
  actual_end_date?: string | null
  completion_percentage?: number
  owner_id?: string | null
  notes?: string | null
  sort_order?: number
}

export interface SoftwareProjectPhaseUpdate {
  title?: string
  status?: SoftwarePhaseStatus
  planned_start_date?: string | null
  planned_end_date?: string | null
  actual_start_date?: string | null
  actual_end_date?: string | null
  completion_percentage?: number
  owner_id?: string | null
  notes?: string | null
  sort_order?: number
}

export interface SoftwareDocumentInsert {
  application_id: string
  doc_type: SoftwareDocumentType
  title: string
  version?: string | null
  storage_url?: string | null
  summary?: string | null
  approved?: boolean
  created_by?: string | null
}

export interface SoftwareDocumentUpdate {
  doc_type?: SoftwareDocumentType
  title?: string
  version?: string | null
  storage_url?: string | null
  summary?: string | null
  approved?: boolean
}

export interface SoftwareMeetingInsert {
  application_id: string
  meeting_date: string
  meeting_type: SoftwareMeetingType
  attendees?: string[]
  summary?: string | null
  notes?: string | null
  next_meeting_date?: string | null
  created_by?: string | null
}

export interface SoftwareMeetingUpdate {
  meeting_date?: string
  meeting_type?: SoftwareMeetingType
  attendees?: string[]
  summary?: string | null
  notes?: string | null
  next_meeting_date?: string | null
}

export interface SoftwareMeetingItemInsert {
  meeting_id: string
  application_id: string
  item_type: SoftwareMeetingItemType
  description: string
  owner_id?: string | null
  due_date?: string | null
  status?: SoftwareMeetingItemStatus
}

export interface SoftwareMeetingItemUpdate {
  item_type?: SoftwareMeetingItemType
  description?: string
  owner_id?: string | null
  due_date?: string | null
  status?: SoftwareMeetingItemStatus
}

export interface SoftwareReleaseInsert {
  application_id: string
  version: string
  environment: SoftwareReleaseEnvironment
  release_date: string
  status?: SoftwareReleaseStatus
  changelog?: string | null
  delivery_document_url?: string | null
  delivered_by?: string | null
}

export interface SoftwareReleaseUpdate {
  version?: string
  environment?: SoftwareReleaseEnvironment
  release_date?: string
  status?: SoftwareReleaseStatus
  changelog?: string | null
  delivery_document_url?: string | null
  delivered_by?: string | null
}

export interface SoftwarePostsaleAdjustmentInsert {
  application_id: string
  requested_at?: string
  title: string
  detail?: string | null
  priority?: SoftwarePostsalePriority
  status?: SoftwarePostsaleStatus
  assigned_to?: string | null
  resolved_at?: string | null
  created_by?: string | null
}

export interface SoftwarePostsaleAdjustmentUpdate {
  requested_at?: string
  title?: string
  detail?: string | null
  priority?: SoftwarePostsalePriority
  status?: SoftwarePostsaleStatus
  assigned_to?: string | null
  resolved_at?: string | null
}

export interface CustomApplicationStats {
  total: number
  active: number
  development: number
  maintenance: number
  deprecated: number
  inactive: number
  expiringDomains: number // dominios que expiran en los próximos 30 días
  expiringHosting: number // hosting que expira en los próximos 30 días
}

// ===================================
// SERVICE CLASS
// ===================================

export class CustomApplicationsService {
  // Obtener todas las aplicaciones
  async getAll(): Promise<CustomApplicationWithRelations[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('custom_applications')
      .select(`
        *,
        client:clients(id, name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Obtener aplicación por ID
  async getById(id: string): Promise<CustomApplicationWithRelations | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('custom_applications')
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  // Crear aplicación
  async create(app: CustomApplicationInsert): Promise<CustomApplication> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('custom_applications')
      .insert([{
        ...app,
        status: app.status || 'active'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Actualizar aplicación
  async update(id: string, updates: CustomApplicationUpdate): Promise<CustomApplication> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('custom_applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Eliminar aplicación
  async delete(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('custom_applications')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Obtener aplicaciones por cliente
  async getByClient(clientId: string): Promise<CustomApplicationWithRelations[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('custom_applications')
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Obtener estadísticas
  async getStats(clientId?: string): Promise<CustomApplicationStats> {
    const supabase = createClient()
    let query = supabase.from('custom_applications').select('*')
    
    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (error) throw error

    const apps = data || []
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const stats: CustomApplicationStats = {
      total: apps.length,
      active: apps.filter(a => a.status === 'active').length,
      development: apps.filter(a => a.status === 'development').length,
      maintenance: apps.filter(a => a.status === 'maintenance').length,
      deprecated: apps.filter(a => a.status === 'deprecated').length,
      inactive: apps.filter(a => a.status === 'inactive').length,
      expiringDomains: apps.filter(a => {
        if (!a.domain_expiry_date) return false
        const expiryDate = new Date(a.domain_expiry_date)
        return expiryDate <= thirtyDaysFromNow && expiryDate > now
      }).length,
      expiringHosting: apps.filter(a => {
        if (!a.hosting_renewal_date) return false
        const renewalDate = new Date(a.hosting_renewal_date)
        return renewalDate <= thirtyDaysFromNow && renewalDate > now
      }).length,
    }

    return stats
  }

  // ===================================
  // SEGUIMIENTOS
  // ===================================

  // Obtener seguimientos de una aplicación
  async getFollowups(applicationId: string): Promise<CustomAppFollowup[]> {
    const supabase = createClient()
    
    console.log('getFollowups - applicationId:', applicationId)
    
    // Obtener seguimientos sin join primero
    const { data: followups, error } = await supabase
      .from('custom_app_followups')
      .select('*')
      .eq('application_id', applicationId)
      .order('fecha_registro', { ascending: false })

    console.log('getFollowups - followups:', followups)
    console.log('getFollowups - error:', error)

    if (error) {
      console.error('Error fetching followups:', error)
      throw error
    }

    if (!followups || followups.length === 0) {
      return []
    }

    // Obtener los IDs únicos de técnicos
    const tecnicoIds = [...new Set(followups.map(f => f.tecnico_responsable).filter(Boolean))]
    
    if (tecnicoIds.length === 0) {
      return followups.map(f => ({ ...f, tecnico: null }))
    }

    // Obtener los perfiles de los técnicos
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', tecnicoIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return followups.map(f => ({ ...f, tecnico: null }))
    }

    // Mapear los seguimientos con sus técnicos
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])
    
    return followups.map(f => ({
      ...f,
      tecnico: f.tecnico_responsable ? profilesMap.get(f.tecnico_responsable) || null : null
    }))
  }

  // Crear seguimiento
  async createFollowup(followup: CustomAppFollowupInsert): Promise<CustomAppFollowup> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('custom_app_followups')
      .insert([followup])
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Eliminar seguimiento
  async deleteFollowup(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('custom_app_followups')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ===================================
  // CICLO DE VIDA DEL PROYECTO
  // ===================================

  async getProjectPhases(applicationId: string): Promise<SoftwareProjectPhase[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_project_phases')
      .select(`
        *,
        owner:profiles(id, first_name, last_name, email)
      `)
      .eq('application_id', applicationId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return (data || []) as SoftwareProjectPhase[]
  }

  async createProjectPhase(payload: SoftwareProjectPhaseInsert): Promise<SoftwareProjectPhase> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_project_phases')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error
    return data as SoftwareProjectPhase
  }

  async updateProjectPhase(id: string, payload: SoftwareProjectPhaseUpdate): Promise<SoftwareProjectPhase> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_project_phases')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data as SoftwareProjectPhase
  }

  async getDocuments(applicationId: string): Promise<SoftwareDocument[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as SoftwareDocument[]
  }

  async createDocument(payload: SoftwareDocumentInsert): Promise<SoftwareDocument> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_documents')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error
    return data as SoftwareDocument
  }

  async updateDocument(id: string, payload: SoftwareDocumentUpdate): Promise<SoftwareDocument> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_documents')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data as SoftwareDocument
  }

  async getMeetings(applicationId: string): Promise<SoftwareMeeting[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_meetings')
      .select('*')
      .eq('application_id', applicationId)
      .order('meeting_date', { ascending: false })

    if (error) throw error
    return (data || []) as SoftwareMeeting[]
  }

  async createMeeting(payload: SoftwareMeetingInsert): Promise<SoftwareMeeting> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_meetings')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error
    return data as SoftwareMeeting
  }

  async getMeetingItems(applicationId: string): Promise<SoftwareMeetingItem[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_meeting_items')
      .select(`
        *,
        owner:profiles(id, first_name, last_name, email),
        meeting:software_meetings(id, meeting_date, meeting_type)
      `)
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as SoftwareMeetingItem[]
  }

  async createMeetingItem(payload: SoftwareMeetingItemInsert): Promise<SoftwareMeetingItem> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_meeting_items')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error
    return data as SoftwareMeetingItem
  }

  async updateMeetingItem(id: string, payload: SoftwareMeetingItemUpdate): Promise<SoftwareMeetingItem> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_meeting_items')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data as SoftwareMeetingItem
  }

  async getReleases(applicationId: string): Promise<SoftwareRelease[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_releases')
      .select('*')
      .eq('application_id', applicationId)
      .order('release_date', { ascending: false })

    if (error) throw error
    return (data || []) as SoftwareRelease[]
  }

  async createRelease(payload: SoftwareReleaseInsert): Promise<SoftwareRelease> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_releases')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error
    return data as SoftwareRelease
  }

  async updateRelease(id: string, payload: SoftwareReleaseUpdate): Promise<SoftwareRelease> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_releases')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data as SoftwareRelease
  }

  async getPostsaleAdjustments(applicationId: string): Promise<SoftwarePostsaleAdjustment[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_postsale_adjustments')
      .select('*')
      .eq('application_id', applicationId)
      .order('requested_at', { ascending: false })

    if (error) throw error
    return (data || []) as SoftwarePostsaleAdjustment[]
  }

  async createPostsaleAdjustment(payload: SoftwarePostsaleAdjustmentInsert): Promise<SoftwarePostsaleAdjustment> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_postsale_adjustments')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error
    return data as SoftwarePostsaleAdjustment
  }

  async updatePostsaleAdjustment(
    id: string,
    payload: SoftwarePostsaleAdjustmentUpdate
  ): Promise<SoftwarePostsaleAdjustment> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('software_postsale_adjustments')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data as SoftwarePostsaleAdjustment
  }
}

export const customApplicationsService = new CustomApplicationsService()
