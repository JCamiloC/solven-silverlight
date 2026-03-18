import { createClient } from '@/lib/supabase/client';
import { HardwareAsset, HardwareUpgrade, AccionRecomendadaEstado } from '@/types';

const supabase = createClient();

export interface HardwareAssociatedTicket {
  id: string
  ticket_number?: string
  title: string
  status: string
  priority: string
  category: string
  created_at: string
}

export class HardwareService {
    async getStatsByClient(clientId: string) {
      const { count: total } = await supabase
        .from('hardware_assets')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      const { count: active } = await supabase
        .from('hardware_assets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('client_id', clientId);

      const { count: maintenance } = await supabase
        .from('hardware_assets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'maintenance')
        .eq('client_id', clientId);

      const { count: retired } = await supabase
        .from('hardware_assets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'retired')
        .eq('client_id', clientId);

      return {
        total: total || 0,
        active: active || 0,
        maintenance: maintenance || 0,
        retired: retired || 0,
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
    
    // Primero obtener los valores actuales
    const { data: currentAsset } = await supabase
      .from('hardware_assets')
      .select('procesador, memoria_ram, disco_duro')
      .eq('id', id)
      .single();
    
    // Detectar cambios en componentes físicos
    const physicalFields = ['procesador', 'memoria_ram', 'disco_duro'] as const;
    const changedFields: string[] = [];
    const upgradeData: Partial<HardwareUpgrade> = {
      hardware_id: id,
      changed_fields: [],
    };
    
    if (currentAsset) {
      for (const field of physicalFields) {
        const oldValue = currentAsset[field];
        const newValue = updates[field];
        
        // Si el campo cambió y no es undefined
        if (newValue !== undefined && oldValue !== newValue) {
          changedFields.push(field);
          upgradeData[`previous_${field}`] = oldValue || null;
          upgradeData[`new_${field}`] = newValue;
        }
      }
    }
    
    // Realizar la actualización del hardware
    const { data, error } = await supabase
      .from('hardware_assets')
      .update(updates)
      .eq('id', id)
      .select(`*, client:clients(name, email, contact_person)`)
      .single();
    
    console.debug('HardwareService.update response:', { data, error })
    if (error) throw error;
    
    // Si hubo cambios físicos, guardar en historial
    if (changedFields.length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const upgradeRecord = {
          hardware_id: id,
          previous_procesador: upgradeData.previous_procesador,
          previous_memoria_ram: upgradeData.previous_memoria_ram,
          previous_disco_duro: upgradeData.previous_disco_duro,
          new_procesador: upgradeData.new_procesador,
          new_memoria_ram: upgradeData.new_memoria_ram,
          new_disco_duro: upgradeData.new_disco_duro,
          changed_fields: changedFields,
          updated_by: user?.id || null,
        };
        
        await supabase
          .from('hardware_upgrades')
          .insert(upgradeRecord);
        
        console.debug('Hardware upgrade history saved:', upgradeRecord);
      } catch (upgradeError) {
        console.error('Error saving hardware upgrade history:', upgradeError);
        // No lanzar error para no interrumpir la actualización principal
      }
    }
    
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

  async getAssociatedTickets(hardwareId: string): Promise<HardwareAssociatedTicket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select('id, ticket_number, title, status, priority, category, created_at')
      .eq('hardware_id', hardwareId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as HardwareAssociatedTicket[];
  }

  async createFollowUp(
    hardwareId: string, 
    payload: { 
      tipo: string
      detalle: string
      accion_recomendada?: string
      accion_recomendada_estado?: AccionRecomendadaEstado
      actividades?: string[]
      foto_url?: string
      fecha_registro?: string
      creado_por?: string
    }
  ) {
    const row = {
      hardware_id: hardwareId,
      tipo: payload.tipo,
      detalle: payload.detalle,
      accion_recomendada: payload.accion_recomendada || null,
      accion_recomendada_estado: payload.accion_recomendada_estado || 'no_realizado',
      actividades: payload.actividades || [],
      foto_url: payload.foto_url || null,
      fecha_registro: payload.fecha_registro || new Date().toISOString(),
      creado_por: payload.creado_por || null,
    };
    const { data, error } = await supabase
      .from('hardware_seguimientos')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Hardware Upgrades (Historial de cambios físicos)
  async getUpgrades(hardwareId: string): Promise<HardwareUpgrade[]> {
    const { data, error } = await supabase
      .from('hardware_upgrades')
      .select(`
        *,
        updater:profiles!updated_by(first_name, last_name, email)
      `)
      .eq('hardware_id', hardwareId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching hardware upgrades:', error);
      throw error;
    }
    return data || [];
  }

  async createUpgrade(upgrade: {
    hardware_id: string
    previous_procesador?: string
    previous_memoria_ram?: string
    previous_disco_duro?: string
    new_procesador?: string
    new_memoria_ram?: string
    new_disco_duro?: string
    changed_fields: string[]
    update_reason?: string
    notes?: string
  }): Promise<HardwareUpgrade> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('hardware_upgrades')
      .insert({
        ...upgrade,
        updated_by: user?.id || null,
      })
      .select(`
        *,
        updater:profiles!updated_by(first_name, last_name, email)
      `)
      .single();
    
    if (error) {
      console.error('Error creating hardware upgrade:', error);
      throw error;
    }
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