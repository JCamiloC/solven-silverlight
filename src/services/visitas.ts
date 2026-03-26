import { createClient } from '@/lib/supabase/client'
import { ClientVisit, ClientVisitEquipment, VisitStatus, VisitType } from '@/types'

const supabase = createClient()

type RawVisit = {
  id: string
  client_id: string
  fecha_visita: string
  tipo: VisitType
  estado: VisitStatus
  detalle: string
  actividades: unknown
  recomendaciones?: string | null
  tecnico_responsable?: string | null
  creado_por?: string | null
  created_at: string
  updated_at: string
}

type RawVisitEquipment = {
  id: string
  visita_id: string
  hardware_id?: string | null
  hardware_nombre_manual?: string | null
  tareas_realizadas: string
  created_at: string
}

type HardwareLite = {
  id: string
  name: string
  serial_number: string
  type: string
}

type ProfileLite = {
  id: string
  first_name?: string
  last_name?: string
  email?: string
}

export interface VisitEquipmentInput {
  hardwareId?: string | null
  hardwareNombreManual?: string
  tareasRealizadas: string
}

export interface CreateClientVisitInput {
  clientId: string
  fechaVisita: string
  tipo: VisitType
  estado?: VisitStatus
  detalle: string
  actividades?: string[]
  recomendaciones?: string
  tecnicoResponsable?: string
  creadoPor?: string
  equipos: VisitEquipmentInput[]
}

export interface UpdateVisitStatusInput {
  visitId: string
  status: VisitStatus
}

function parseActivities(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

class VisitasService {
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

  private async list(clientId?: string): Promise<ClientVisit[]> {
    let query = supabase
      .from('client_visitas')
      .select('*')
      .order('fecha_visita', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (error) throw this.toError(error, 'No se pudieron consultar las visitas')

    const visits = (data || []) as RawVisit[]
    if (visits.length === 0) return []

    const visitIds = visits.map((visit) => visit.id)

    const { data: equipmentData, error: equipmentError } = await supabase
      .from('client_visita_equipos')
      .select('*')
      .in('visita_id', visitIds)

    if (equipmentError) {
      throw this.toError(equipmentError, 'No se pudo consultar el detalle de equipos por visita')
    }

    const rawEquipment = (equipmentData || []) as RawVisitEquipment[]

    const hardwareIds = Array.from(
      new Set(
        rawEquipment
          .map((item) => item.hardware_id)
          .filter((id): id is string => Boolean(id))
      )
    )

    let hardwareMap = new Map<string, HardwareLite>()
    if (hardwareIds.length > 0) {
      const { data: hardwareData, error: hardwareError } = await supabase
        .from('hardware_assets')
        .select('id, name, serial_number, type')
        .in('id', hardwareIds)

      if (hardwareError) throw this.toError(hardwareError, 'No se pudo consultar el inventario de hardware')

      hardwareMap = new Map(
        ((hardwareData || []) as HardwareLite[]).map((item) => [item.id, item])
      )
    }

    const profileIds = Array.from(
      new Set(
        visits
          .flatMap((visit) => [visit.tecnico_responsable, visit.creado_por])
          .filter((id): id is string => Boolean(id))
      )
    )

    let profileMap = new Map<string, ProfileLite>()
    if (profileIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', profileIds)

      if (profileError) throw this.toError(profileError, 'No se pudo consultar la información de técnicos')

      profileMap = new Map(
        ((profileData || []) as Array<{ id: string; first_name?: string | null; last_name?: string | null; email?: string | null }>).map((profile) => [
          profile.id,
          {
            id: profile.id,
            first_name: profile.first_name || undefined,
            last_name: profile.last_name || undefined,
            email: profile.email || undefined,
          },
        ])
      )
    }

    const equipmentByVisit = new Map<string, ClientVisitEquipment[]>()

    rawEquipment.forEach((item) => {
      const hardware = item.hardware_id ? hardwareMap.get(item.hardware_id) || null : null

      const mapped: ClientVisitEquipment = {
        id: item.id,
        visita_id: item.visita_id,
        hardware_id: item.hardware_id || null,
        hardware_nombre_manual: item.hardware_nombre_manual || null,
        tareas_realizadas: item.tareas_realizadas,
        created_at: item.created_at,
        hardware: hardware
          ? {
              id: hardware.id,
              name: hardware.name,
              serial_number: hardware.serial_number,
              type: hardware.type,
            }
          : null,
      }

      const current = equipmentByVisit.get(item.visita_id) || []
      equipmentByVisit.set(item.visita_id, [...current, mapped])
    })

    return visits.map((visit) => ({
      id: visit.id,
      client_id: visit.client_id,
      fecha_visita: visit.fecha_visita,
      tipo: visit.tipo,
      estado: visit.estado,
      detalle: visit.detalle,
      actividades: parseActivities(visit.actividades),
      recomendaciones: visit.recomendaciones || null,
      tecnico_responsable: visit.tecnico_responsable || null,
      creado_por: visit.creado_por || null,
      created_at: visit.created_at,
      updated_at: visit.updated_at,
      tecnico: visit.tecnico_responsable ? profileMap.get(visit.tecnico_responsable) || null : null,
      equipos: equipmentByVisit.get(visit.id) || [],
    }))
  }

  async listByClient(clientId: string): Promise<ClientVisit[]> {
    if (!clientId) return []
    return this.list(clientId)
  }

  async listAll(): Promise<ClientVisit[]> {
    return this.list()
  }

  async createVisit(input: CreateClientVisitInput): Promise<ClientVisit> {
    if (!input.clientId) {
      throw new Error('El cliente es requerido para registrar la visita')
    }

    const cleanedEquipment = input.equipos
      .map((item) => ({
        hardwareId: item.hardwareId?.trim() || null,
        hardwareNombreManual: item.hardwareNombreManual?.trim() || null,
        tareasRealizadas: item.tareasRealizadas.trim(),
      }))
      .filter((item) => item.tareasRealizadas && (item.hardwareId || item.hardwareNombreManual))

    if (cleanedEquipment.length === 0) {
      throw new Error('Debes registrar al menos un equipo con tareas realizadas')
    }

    const row = {
      client_id: input.clientId,
      fecha_visita: input.fechaVisita,
      tipo: input.tipo,
      estado: input.estado || 'completada',
      detalle: input.detalle.trim(),
      actividades: input.actividades || [],
      recomendaciones: input.recomendaciones?.trim() || null,
      tecnico_responsable: input.tecnicoResponsable || null,
      creado_por: input.creadoPor || null,
    }

    const { data: visitData, error: visitError } = await supabase
      .from('client_visitas')
      .insert(row)
      .select('*')
      .single()

    if (visitError || !visitData) {
      throw this.toError(visitError, 'No se pudo crear la visita técnica')
    }

    const equipmentRows = cleanedEquipment.map((item) => ({
      visita_id: (visitData as RawVisit).id,
      hardware_id: item.hardwareId,
      hardware_nombre_manual: item.hardwareNombreManual,
      tareas_realizadas: item.tareasRealizadas,
    }))

    const { error: equipmentError } = await supabase
      .from('client_visita_equipos')
      .insert(equipmentRows)

    if (equipmentError) {
      await supabase.from('client_visitas').delete().eq('id', (visitData as RawVisit).id)
      throw this.toError(equipmentError, 'No se pudo guardar el detalle de equipos de la visita')
    }

    const visits = await this.listByClient(input.clientId)
    const created = visits.find((visit) => visit.id === (visitData as RawVisit).id)

    if (created) return created

    return {
      id: (visitData as RawVisit).id,
      client_id: input.clientId,
      fecha_visita: (visitData as RawVisit).fecha_visita,
      tipo: (visitData as RawVisit).tipo,
      estado: (visitData as RawVisit).estado,
      detalle: (visitData as RawVisit).detalle,
      actividades: parseActivities((visitData as RawVisit).actividades),
      recomendaciones: (visitData as RawVisit).recomendaciones || null,
      tecnico_responsable: (visitData as RawVisit).tecnico_responsable || null,
      creado_por: (visitData as RawVisit).creado_por || null,
      created_at: (visitData as RawVisit).created_at,
      updated_at: (visitData as RawVisit).updated_at,
      tecnico: null,
      equipos: [],
    }
  }

  async updateVisitStatus(input: UpdateVisitStatusInput): Promise<ClientVisit> {
    if (!input.visitId) {
      throw new Error('La visita es requerida para actualizar su estado')
    }

    const { data, error } = await supabase
      .from('client_visitas')
      .update({
        estado: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.visitId)
      .select('*')
      .single()

    if (error || !data) {
      throw this.toError(error, 'No se pudo actualizar el estado de la visita')
    }

    const visits = await this.listByClient((data as RawVisit).client_id)
    const updated = visits.find((visit) => visit.id === input.visitId)

    if (updated) return updated

    return {
      id: (data as RawVisit).id,
      client_id: (data as RawVisit).client_id,
      fecha_visita: (data as RawVisit).fecha_visita,
      tipo: (data as RawVisit).tipo,
      estado: (data as RawVisit).estado,
      detalle: (data as RawVisit).detalle,
      actividades: parseActivities((data as RawVisit).actividades),
      recomendaciones: (data as RawVisit).recomendaciones || null,
      tecnico_responsable: (data as RawVisit).tecnico_responsable || null,
      creado_por: (data as RawVisit).creado_por || null,
      created_at: (data as RawVisit).created_at,
      updated_at: (data as RawVisit).updated_at,
      tecnico: null,
      equipos: [],
    }
  }
}

export const visitasService = new VisitasService()
