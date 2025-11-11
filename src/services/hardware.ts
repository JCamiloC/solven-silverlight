import { createClient } from '@/lib/supabase/client'
import { HardwareAsset } from '@/types'

const supabase = createClient()

export class HardwareService {
  async getAll(): Promise<HardwareAsset[]> {
    const { data, error } = await supabase
      .from('hardware_assets')
      .select(`
        *,
        client:clients(name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getById(id: string): Promise<HardwareAsset | null> {
    const { data, error } = await supabase
      .from('hardware_assets')
      .select(`
        *,
        client:clients(name)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async create(asset: Omit<HardwareAsset, 'id' | 'created_at' | 'updated_at'>): Promise<HardwareAsset> {
    const { data, error } = await supabase
      .from('hardware_assets')
      .insert(asset)
      .select(`
        *,
        client:clients(name)
      `)
      .single()

    if (error) throw error
    return data
  }

  async update(id: string, updates: Partial<HardwareAsset>): Promise<HardwareAsset> {
    const { data, error } = await supabase
      .from('hardware_assets')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        client:clients(name)
      `)
      .single()

    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('hardware_assets')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async getStats() {
    const { data: total } = await supabase
      .from('hardware_assets')
      .select('id', { count: 'exact', head: true })

    const { data: active } = await supabase
      .from('hardware_assets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')

    const { data: maintenance } = await supabase
      .from('hardware_assets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'maintenance')

    const { data: retired } = await supabase
      .from('hardware_assets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'retired')

    return {
      total: total?.length || 0,
      active: active?.length || 0,
      maintenance: maintenance?.length || 0,
      retired: retired?.length || 0,
    }
  }
}

export const hardwareService = new HardwareService()