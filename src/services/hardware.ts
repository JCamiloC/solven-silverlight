import { createClient } from '@/lib/supabase/client';
import { HardwareAsset } from '@/types';

const supabase = createClient();

export class HardwareService {
    async getStatsByClient(clientId: string) {
      const { data: total } = await supabase
        .from('hardware_assets')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);

      const { data: active } = await supabase
        .from('hardware_assets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('client_id', clientId);

      const { data: maintenance } = await supabase
        .from('hardware_assets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'maintenance')
        .eq('client_id', clientId);

      const { data: retired } = await supabase
        .from('hardware_assets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'retired')
        .eq('client_id', clientId);

      return {
        total: total?.length || 0,
        active: active?.length || 0,
        maintenance: maintenance?.length || 0,
        retired: retired?.length || 0,
      };
    }
  async getAll(): Promise<HardwareAsset[]> {
    const { data, error } = await supabase
      .from('hardware_assets')
      .select(`*, client:clients(name, email, contact_person)`) // ajusta los campos según lo que necesites
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getByClient(clientId: string): Promise<HardwareAsset[]> {
    const { data, error } = await supabase
      .from('hardware_assets')
      .select(`*`)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getById(id: string): Promise<HardwareAsset | null> {
    const { data, error } = await supabase
      .from('hardware_assets')
      .select(`*, client:clients(name, email, contact_person)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async create(asset: Omit<HardwareAsset, 'id' | 'created_at' | 'updated_at'>): Promise<HardwareAsset> {
    console.debug('HardwareService.create payload:', asset)
    const { data, error } = await supabase
      .from('hardware_assets')
      .insert(asset)
      .select(`*, client:clients(name, email, contact_person)`)
      .single();
    console.debug('HardwareService.create response:', { data, error })
    if (error) throw error;
    return data;
  }

  async update(id: string, updates: Partial<HardwareAsset>): Promise<HardwareAsset> {
    console.debug('HardwareService.update payload:', { id, updates })
    const { data, error } = await supabase
      .from('hardware_assets')
      .update(updates)
      .eq('id', id)
      .select(`*, client:clients(name, email, contact_person)`)
      .single();
    console.debug('HardwareService.update response:', { data, error })
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('hardware_assets')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Seguimientos (follow-ups)
  async getFollowUps(hardwareId: string) {
    const { data, error } = await supabase
      .from('hardware_seguimientos')
      .select(`*, creator:profiles(first_name, last_name)`) // include creator profile
      .eq('hardware_id', hardwareId)
      .order('fecha_registro', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createFollowUp(hardwareId: string, payload: { tipo: string; detalle: string; creado_por?: string }) {
    const row = {
      hardware_id: hardwareId,
      tipo: payload.tipo,
      detalle: payload.detalle,
      creado_por: payload.creado_por || null,
    };
    const { data, error } = await supabase
      .from('hardware_seguimientos')
      .insert(row)
      .single();
    if (error) throw error;
    return data;
  }

  async getStats() {
    const { data: total } = await supabase
      .from('hardware_assets')
      .select('id', { count: 'exact', head: true });

    const { data: active } = await supabase
      .from('hardware_assets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: maintenance } = await supabase
      .from('hardware_assets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'maintenance');

    const { data: retired } = await supabase
      .from('hardware_assets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'retired');

    return {
      total: total?.length || 0,
      active: active?.length || 0,
      maintenance: maintenance?.length || 0,
      retired: retired?.length || 0,
    };
  }
}

export const hardwareService = new HardwareService();