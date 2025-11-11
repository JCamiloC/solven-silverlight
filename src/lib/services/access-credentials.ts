import { createClient } from '@/lib/supabase/client'
import { CryptoService } from '@/lib/crypto'

const supabase = createClient()

export interface AccessCredential {
  id: string
  client_id: string
  system_name: string
  username: string
  password_hash: string // Encrypted password
  url?: string
  notes?: string
  created_by: string
  last_accessed?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface AccessCredentialInsert {
  client_id: string
  system_name: string
  username: string
  password: string // Plain password that will be encrypted
  url?: string
  notes?: string
  created_by: string
  status?: 'active' | 'inactive'
}

export interface AccessCredentialUpdate {
  client_id?: string
  system_name?: string
  username?: string
  password?: string // Plain password that will be encrypted
  url?: string
  notes?: string
  status?: 'active' | 'inactive'
}

export interface AccessCredentialWithRelations extends Omit<AccessCredential, 'password_hash'> {
  client?: {
    id: string
    name: string
  } | null
  created_by_profile?: {
    id: string
    first_name: string
    last_name: string
  } | null
  // Password is never exposed in relations for security
}

export interface AccessCredentialDecrypted extends AccessCredentialWithRelations {
  password: string // Decrypted password - only returned when explicitly requested
}

export interface AccessLog {
  id: string
  credential_id: string
  accessed_by: string
  accessed_at: string
  purpose: string
  ip_address?: string
}

export interface AccessStats {
  total: number
  active: number
  inactive: number
  recentlyAccessed: number
  totalAccesses: number
}

export class AccessCredentialsService {
  /**
   * Get all credentials (without passwords)
   */
  async getAll(): Promise<AccessCredentialWithRelations[]> {
    const { data, error } = await supabase
      .from('access_credentials')
      .select(`
        id,
        client_id,
        system_name,
        username,
        url,
        notes,
        created_by,
        last_accessed,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Get related data separately to avoid complex joins
    const credentialsWithRelations = await Promise.all(
      (data || []).map(async (credential) => {
        const [clientData, profileData] = await Promise.all([
          credential.client_id ? supabase
            .from('clients')
            .select('id, name')
            .eq('id', credential.client_id)
            .single()
            .then(result => result.data) : null,
          supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('user_id', credential.created_by)
            .single()
            .then(result => result.data)
        ])

        return {
          ...credential,
          client: clientData,
          created_by_profile: profileData
        } as AccessCredentialWithRelations
      })
    )

    return credentialsWithRelations
  }

  /**
   * Get credential by ID (without password)
   */
  async getById(id: string): Promise<AccessCredentialWithRelations | null> {
    const { data, error } = await supabase
      .from('access_credentials')
      .select(`
        id,
        client_id,
        system_name,
        username,
        url,
        notes,
        created_by,
        last_accessed,
        status,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return null

    // Get related data
    const [clientData, profileData] = await Promise.all([
      data.client_id ? supabase
        .from('clients')
        .select('id, name')
        .eq('id', data.client_id)
        .single()
        .then(result => result.data) : null,
      supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('user_id', data.created_by)
        .single()
        .then(result => result.data)
    ])

    return {
      ...data,
      client: clientData,
      created_by_profile: profileData
    } as AccessCredentialWithRelations
  }

  /**
   * Get credential with decrypted password (requires additional verification)
   */
  async getWithPassword(id: string, userId: string, purpose: string): Promise<AccessCredentialDecrypted | null> {
    try {
      // First get the credential with encrypted password
      const { data, error } = await supabase
        .from('access_credentials')
        .select(`
          *,
          client:clients(id, name),
          created_by_profile:profiles!created_by(id, first_name, last_name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) return null

      // Decrypt the password
      const decryptedPassword = CryptoService.decrypt(data.password_hash)

      // Log the access
      await this.logAccess(id, userId, purpose)

      // Update last accessed
      await supabase
        .from('access_credentials')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', id)

      // Return credential with decrypted password (excluding password_hash)
      const { password_hash, ...credentialData } = data
      return {
        ...credentialData,
        password: decryptedPassword
      }
    } catch (error) {
      console.error('Error getting credential with password:', error)
      throw new Error('Failed to retrieve credential')
    }
  }

  /**
   * Create new credential with encrypted password
   */
  async create(credential: AccessCredentialInsert): Promise<AccessCredential> {
    try {
      // Encrypt the password
      const encryptedPassword = CryptoService.encrypt(credential.password)

      const { data, error } = await supabase
        .from('access_credentials')
        .insert([{
          ...credential,
          password_hash: encryptedPassword,
          status: credential.status || 'active',
          // Remove plain password from insert
          password: undefined
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating credential:', error)
      throw new Error('Failed to create credential')
    }
  }

  /**
   * Update credential (password will be re-encrypted if provided)
   */
  async update(id: string, updates: AccessCredentialUpdate): Promise<AccessCredential> {
    try {
      const updateData: any = { ...updates }

      // If password is being updated, encrypt it
      if (updates.password) {
        updateData.password_hash = CryptoService.encrypt(updates.password)
        delete updateData.password // Remove plain password
      }

      const { data, error } = await supabase
        .from('access_credentials')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating credential:', error)
      throw new Error('Failed to update credential')
    }
  }

  /**
   * Delete credential
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('access_credentials')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Get credentials by client
   */
  async getByClient(clientId: string): Promise<AccessCredentialWithRelations[]> {
    const { data, error } = await supabase
      .from('access_credentials')
      .select(`
        id,
        client_id,
        system_name,
        username,
        url,
        notes,
        created_by,
        last_accessed,
        status,
        created_at,
        updated_at
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get related data for each credential
    const credentialsWithRelations = await Promise.all(
      (data || []).map(async (credential) => {
        const [clientData, profileData] = await Promise.all([
          supabase
            .from('clients')
            .select('id, name')
            .eq('id', credential.client_id)
            .single()
            .then(result => result.data),
          supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('user_id', credential.created_by)
            .single()
            .then(result => result.data)
        ])

        return {
          ...credential,
          client: clientData,
          created_by_profile: profileData
        } as AccessCredentialWithRelations
      })
    )

    return credentialsWithRelations
  }

  /**
   * Get access statistics
   */
  async getStats(): Promise<AccessStats> {
    const { data, error } = await supabase
      .from('access_credentials')
      .select('*')

    if (error) throw error

    const credentials = data || []
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get access logs count
    const { count: totalAccesses } = await supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true })

    const stats: AccessStats = {
      total: credentials.length,
      active: credentials.filter(c => c.status === 'active').length,
      inactive: credentials.filter(c => c.status === 'inactive').length,
      recentlyAccessed: credentials.filter(c => {
        if (!c.last_accessed) return false
        return new Date(c.last_accessed) >= sevenDaysAgo
      }).length,
      totalAccesses: totalAccesses || 0
    }

    return stats
  }

  /**
   * Log credential access for audit trail
   */
  async logAccess(credentialId: string, userId: string, purpose: string, ipAddress?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('access_logs')
        .insert([{
          credential_id: credentialId,
          accessed_by: userId,
          purpose,
          ip_address: ipAddress,
          accessed_at: new Date().toISOString()
        }])

      if (error) throw error
    } catch (error) {
      console.error('Error logging access:', error)
      // Don't throw error for logging failures to avoid breaking main operations
    }
  }

  /**
   * Get access logs for a credential
   */
  async getAccessLogs(credentialId: string): Promise<AccessLog[]> {
    const { data, error } = await supabase
      .from('access_logs')
      .select(`
        *,
        accessed_by_profile:profiles!accessed_by(id, first_name, last_name)
      `)
      .eq('credential_id', credentialId)
      .order('accessed_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get all access logs (for admin audit)
   */
  async getAllAccessLogs(): Promise<AccessLog[]> {
    const { data, error } = await supabase
      .from('access_logs')
      .select(`
        *,
        credential:access_credentials(id, system_name),
        accessed_by_profile:profiles!accessed_by(id, first_name, last_name)
      `)
      .order('accessed_at', { ascending: false })
      .limit(1000) // Limit for performance

    if (error) throw error
    return data || []
  }

  /**
   * Test credential password strength
   */
  validatePasswordStrength(password: string): {
    score: number
    feedback: string[]
    isStrong: boolean
  } {
    const feedback: string[] = []
    let score = 0

    // Length
    if (password.length >= 12) {
      score += 25
    } else if (password.length >= 8) {
      score += 15
    } else {
      feedback.push('La contraseña debe tener al menos 8 caracteres')
    }

    // Complexity checks
    if (/[A-Z]/.test(password)) score += 15
    else feedback.push('Incluir al menos una letra mayúscula')

    if (/[a-z]/.test(password)) score += 15
    else feedback.push('Incluir al menos una letra minúscula')

    if (/\d/.test(password)) score += 15
    else feedback.push('Incluir al menos un número')

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20
    else feedback.push('Incluir al menos un carácter especial')

    // No repeated patterns
    if (!/(.)\1{2,}/.test(password)) score += 10
    else feedback.push('Evitar repetir el mismo carácter más de 2 veces')

    return {
      score,
      feedback,
      isStrong: score >= 80
    }
  }
}

export const accessCredentialsService = new AccessCredentialsService()