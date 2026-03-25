import { createClient } from '@/lib/supabase/client'

export type ClientMaintenanceStatus = 'pendiente' | 'realizado' | 'reprogramado' | 'omitido'

export interface ClientMaintenanceSchedule {
  id: string
  client_id: string
  year: number
  slot_number: number
  expected_date: string
  status: ClientMaintenanceStatus
  completed_at?: string | null
  completed_by?: string | null
  notes?: string | null
  related_ticket_id?: string | null
  created_at: string
  updated_at: string
}

export interface ClientMaintenanceUpdate {
  expected_date?: string
  status?: ClientMaintenanceStatus
  notes?: string | null
  related_ticket_id?: string | null
}

export interface UpcomingClientMaintenance {
  id: string
  client_id: string
  client_name: string
  year: number
  slot_number: number
  expected_date: string
  status: ClientMaintenanceStatus
  notes?: string | null
}

class ClientMaintenancesService {
  private toError(error: unknown, fallback: string): Error {
    if (error instanceof Error) return error
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) {
        return new Error(message)
      }
    }
    return new Error(fallback)
  }

  async listByClient(clientId: string, year: number): Promise<ClientMaintenanceSchedule[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('client_maintenance_schedule')
      .select('*')
      .eq('client_id', clientId)
      .eq('year', year)
      .order('slot_number', { ascending: true })

    if (error) throw this.toError(error, 'No se pudo consultar la agenda de mantenimientos')
    return (data || []) as ClientMaintenanceSchedule[]
  }

  async listUpcoming(limit = 5): Promise<UpcomingClientMaintenance[]> {
    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('client_maintenance_schedule')
      .select('id, client_id, year, slot_number, expected_date, status, notes, clients(name)')
      .in('status', ['pendiente', 'reprogramado'])
      .gte('expected_date', today)
      .order('expected_date', { ascending: true })
      .limit(limit)

    if (error) throw this.toError(error, 'No se pudo consultar los mantenimientos próximos')

    return ((data || []) as Array<Record<string, unknown>>).map((row) => {
      const rawClient = row.clients as { name?: string } | Array<{ name?: string }> | null | undefined
      const clientName = Array.isArray(rawClient)
        ? rawClient[0]?.name || 'Cliente sin nombre'
        : rawClient?.name || 'Cliente sin nombre'

      return {
        id: String(row.id || ''),
        client_id: String(row.client_id || ''),
        client_name: clientName,
        year: Number(row.year || 0),
        slot_number: Number(row.slot_number || 0),
        expected_date: String(row.expected_date || ''),
        status: (row.status as ClientMaintenanceStatus) || 'pendiente',
        notes: (row.notes as string | null | undefined) || null,
      }
    })
  }

  async ensureYearSchedule(clientId: string, year: number, totalMaintenances: number): Promise<ClientMaintenanceSchedule[]> {
    if (!clientId || !year || totalMaintenances <= 0) return []

    const existing = await this.listByClient(clientId, year)
    const supabase = createClient()
    const existingSlots = new Set(existing.map((row) => row.slot_number))

    const missingRows: Array<Pick<ClientMaintenanceSchedule, 'client_id' | 'year' | 'slot_number' | 'expected_date' | 'status'>> = []
    const rowsToDelete: string[] = []
    const rowsToReschedule: Array<Pick<ClientMaintenanceSchedule, 'id' | 'expected_date'>> = []

    for (const row of existing) {
      if (row.slot_number > totalMaintenances) {
        // Conservamos mantenimientos ya realizados por trazabilidad histórica.
        if (row.status !== 'realizado') {
          rowsToDelete.push(row.id)
        }
        continue
      }

      if (row.status !== 'realizado') {
        const nextExpectedDate = this.calculateExpectedDate(year, row.slot_number, totalMaintenances)
        if (row.expected_date !== nextExpectedDate) {
          rowsToReschedule.push({
            id: row.id,
            expected_date: nextExpectedDate,
          })
        }
      }
    }

    for (let slot = 1; slot <= totalMaintenances; slot++) {
      if (!existingSlots.has(slot)) {
        missingRows.push({
          client_id: clientId,
          year,
          slot_number: slot,
          expected_date: this.calculateExpectedDate(year, slot, totalMaintenances),
          status: 'pendiente',
        })
      }
    }

    if (rowsToDelete.length > 0) {
      const { error } = await supabase
        .from('client_maintenance_schedule')
        .delete()
        .in('id', rowsToDelete)

      if (error) throw this.toError(error, 'No se pudo redimensionar la agenda al nuevo total anual')
    }

    if (rowsToReschedule.length > 0) {
      for (const row of rowsToReschedule) {
        const { error } = await supabase
          .from('client_maintenance_schedule')
          .update({ expected_date: row.expected_date })
          .eq('id', row.id)

        if (error) throw this.toError(error, 'No se pudo recalcular las fechas de la agenda')
      }
    }

    if (missingRows.length > 0) {
      const { error } = await supabase
        .from('client_maintenance_schedule')
        .upsert(missingRows, { onConflict: 'client_id,year,slot_number', ignoreDuplicates: true })

      if (error) throw this.toError(error, 'No se pudo generar/completar la agenda')
    }

    return this.listByClient(clientId, year)
  }

  async update(id: string, updates: ClientMaintenanceUpdate, updaterId?: string): Promise<ClientMaintenanceSchedule> {
    const supabase = createClient()

    const payload: Record<string, unknown> = {
      ...updates,
    }

    if (updates.status === 'realizado') {
      payload.completed_at = new Date().toISOString()
      if (updaterId) payload.completed_by = updaterId
    }

    if (updates.status && updates.status !== 'realizado') {
      payload.completed_at = null
      payload.completed_by = null
    }

    const { data, error } = await supabase
      .from('client_maintenance_schedule')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw this.toError(error, 'No se pudo actualizar el mantenimiento')
    return data as ClientMaintenanceSchedule
  }

  private calculateExpectedDate(year: number, slotNumber: number, totalMaintenances: number): string {
    const monthIndex = Math.max(0, Math.min(11, Math.round(((slotNumber - 0.5) * 12) / totalMaintenances) - 1))
    const date = new Date(Date.UTC(year, monthIndex, 15))
    return date.toISOString().split('T')[0]
  }
}

export const clientMaintenancesService = new ClientMaintenancesService()
