import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export class ParametersService {
  async getAll() {
    const { data, error } = await supabase
      .from('parametros')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getByKey(key: string) {
    const { data, error } = await supabase
      .from('parametros')
      .select('*')
      .eq('key', key)
      .single()

    if (error) {
      if ((error as any).code === 'PGRST116') return null
      throw error
    }
    return data || null
  }

  async create(payload: { key: string; name: string; description?: string; options?: any[]; metadata?: any; client_specific?: boolean }) {
    const row = {
      key: payload.key,
      name: payload.name,
      description: payload.description || null,
      options: payload.options || [],
      metadata: payload.metadata || {},
      client_specific: payload.client_specific || false,
    }
    try {
      console.debug('ParametersService.create payload:', row)
      const { data, error } = await supabase
        .from('parametros')
        .insert(row)
        .single()
      console.debug('ParametersService.create response:', { data, error })
      if (error) throw error
      return data
    } catch (err) {
      console.error('ParametersService.create error:', err)
      throw err
    }
  }

  async update(keyOrId: string, updates: { name?: string; description?: string; options?: any[]; metadata?: any; client_specific?: boolean }) {
    // allow updating by key or id
    const query = supabase.from('parametros').update(updates)
    if (isUuid(keyOrId)) query.eq('id', keyOrId)
    else query.eq('key', keyOrId)
    try {
      console.debug('ParametersService.update variables:', { keyOrId, updates })
      const { data, error } = await query.select('*').single()
      console.debug('ParametersService.update response:', { data, error })
      if (error) throw error
      return data
    } catch (err) {
      console.error('ParametersService.update error:', err)
      throw err
    }
  }

  async delete(keyOrId: string) {
    const query = supabase.from('parametros').delete()
    if (isUuid(keyOrId)) query.eq('id', keyOrId)
    else query.eq('key', keyOrId)
    const { error } = await query
    if (error) throw error
    return true
  }
}

function isUuid(value: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value)
}

export const parametersService = new ParametersService()
