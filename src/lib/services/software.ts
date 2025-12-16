import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

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
  purchase_date: string
  expiry_date?: string
  cost: number
  status: 'active' | 'expired' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface SoftwareLicenseInsert {
  client_id: string
  name: string
  vendor: string
  version: string
  license_key: string
  license_type?: 'perpetual' | 'subscription' | 'oem'
  periodicidad?: 'mensual' | 'anual'
  seats: number
  purchase_date?: string
  expiry_date?: string
  cost?: number
  status?: 'active' | 'expired' | 'cancelled'
}

export interface SoftwareLicenseUpdate {
  client_id?: string
  name?: string
  vendor?: string
  version?: string
  license_key?: string
  license_type?: 'perpetual' | 'subscription' | 'oem'
  periodicidad?: 'mensual' | 'anual'
  seats?: number
  purchase_date?: string
  expiry_date?: string
  cost?: number
  status?: 'active' | 'expired' | 'cancelled'
}

export interface SoftwareLicenseWithRelations extends SoftwareLicense {
  client?: {
    id: string
    name: string
  }
}

export interface SoftwareStats {
  total: number
  active: number
  expired: number
  expiringSoon: number
  totalCost: number
  averageCostPerSeat: number
}

export class SoftwareService {
  async getAll(): Promise<SoftwareLicenseWithRelations[]> {
    const { data, error } = await supabase
      .from('software_licenses')
      .select(`
        *,
        client:clients(id, name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getById(id: string): Promise<SoftwareLicenseWithRelations | null> {
    const { data, error } = await supabase
      .from('software_licenses')
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async create(license: SoftwareLicenseInsert): Promise<SoftwareLicense> {
    const { data, error } = await supabase
      .from('software_licenses')
      .insert([{
        ...license,
        license_type: license.license_type || 'subscription',
        status: license.status || 'active'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async update(id: string, updates: SoftwareLicenseUpdate): Promise<SoftwareLicense> {
    const { data, error } = await supabase
      .from('software_licenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('software_licenses')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async getStats(): Promise<SoftwareStats> {
    const { data, error } = await supabase
      .from('software_licenses')
      .select('*')

    if (error) throw error

    const licenses = data || []
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const stats: SoftwareStats = {
      total: licenses.length,
      active: licenses.filter(l => l.status === 'active').length,
      expired: licenses.filter(l => l.status === 'expired').length,
      expiringSoon: licenses.filter(l => {
        if (!l.expiry_date || l.status !== 'active') return false
        const expiryDate = new Date(l.expiry_date)
        return expiryDate <= thirtyDaysFromNow && expiryDate > now
      }).length,
      totalCost: licenses.reduce((sum, l) => sum + Number(l.cost), 0),
      averageCostPerSeat: licenses.length > 0 
        ? licenses.reduce((sum, l) => sum + (Number(l.cost) / l.seats), 0) / licenses.length
        : 0
    }

    return stats
  }

  async getByClient(clientId: string): Promise<SoftwareLicenseWithRelations[]> {
    const { data, error } = await supabase
      .from('software_licenses')
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getExpiringSoon(days: number = 30): Promise<SoftwareLicenseWithRelations[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const { data, error } = await supabase
      .from('software_licenses')
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('status', 'active')
      .not('expiry_date', 'is', null)
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })

    if (error) throw error
    return data || []
  }
}

export const softwareService = new SoftwareService()