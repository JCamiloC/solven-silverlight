import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Configure otplib
authenticator.options = {
  step: 30, // 30 seconds
  window: 2, // Allow 2 time steps (1 minute tolerance)
}

// Utility function to verify TOTP tokens using otplib
function verifyTOTPToken(secret: string, token: string, window: number = 2): boolean {
  try {
    // Set custom window for this verification
    const originalWindow = authenticator.options.window
    authenticator.options = { ...authenticator.options, window }
    
    const isValid = authenticator.verify({
      token: token.toString().trim(),
      secret: secret
    })
    
    // Restore original window
    authenticator.options = { ...authenticator.options, window: originalWindow }
    
    return isValid
  } catch (error) {
    console.error('TOTP verification failed:', error)
    return false
  }
}

export interface TOTPSetup {
  secret: string
  qrCodeUrl: string
  manualEntryKey: string
}

export interface TOTPVerification {
  isValid: boolean
  message: string
}

export class TwoFactorService {
  /**
   * Genera un nuevo secret TOTP para el usuario
   */
  static async setupTOTP(userId: string, userEmail: string): Promise<TOTPSetup> {
    try {
      // Generar secret usando otplib
      const secret = authenticator.generateSecret()
      
      // Crear el servicio y otpauth URL
      const service = `Mesa de Ayuda (${userEmail})`
      const issuer = 'Mesa de Ayuda - Solven'
      const otpauthUrl = authenticator.keyuri(userEmail, issuer, secret)

      // Generar QR code
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl)

      // Guardar el secret en la base de datos (temporalmente, hasta que se verifique)
      const { error } = await supabase
        .from('profiles')
        .update({ 
          totp_secret: secret,
          totp_enabled: false // Se habilitará después de la verificación
        })
        .eq('user_id', userId)

      if (error) throw error

      return {
        secret: secret,
        qrCodeUrl,
        manualEntryKey: secret
      }
    } catch (error) {
      console.error('Error setting up TOTP:', error)
      throw new Error('Failed to setup two-factor authentication')
    }
  }

  /**
   * Verifica un código TOTP y habilita 2FA si es correcto
   */
  static async verifyAndEnableTOTP(userId: string, token: string): Promise<TOTPVerification> {
    try {
      // Obtener el secret del usuario
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('totp_secret')
        .eq('user_id', userId)
        .single()

      if (error || !profile?.totp_secret) {
        return {
          isValid: false,
          message: 'No se encontró configuración 2FA para este usuario'
        }
      }

      // Verificar el token usando nuestra función auxiliar robusta
      const verified = verifyTOTPToken(profile.totp_secret, token, 2)

      if (verified) {
        // Habilitar 2FA en el perfil
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            totp_enabled: true,
            last_totp_verification: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) throw updateError

        return {
          isValid: true,
          message: 'Autenticación de dos factores habilitada exitosamente'
        }
      } else {
        return {
          isValid: false,
          message: 'Código inválido. Verifica que el código sea correcto y no haya expirado.'
        }
      }
    } catch (error) {
      console.error('Error verifying TOTP:', error)
      return {
        isValid: false,
        message: 'Error al verificar el código'
      }
    }
  }

  /**
   * Verifica un código TOTP para operaciones sensibles
   */
  static async verifyTOTP(userId: string, token: string): Promise<TOTPVerification> {
    try {
      // Obtener el secret del usuario
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('totp_secret, totp_enabled')
        .eq('user_id', userId)
        .single()

      if (error || !profile?.totp_secret || !profile?.totp_enabled) {
        return {
          isValid: false,
          message: '2FA no está configurado para este usuario'
        }
      }

      // Verificar el token usando nuestra función auxiliar robusta
      const verified = verifyTOTPToken(profile.totp_secret, token, 1)

      if (verified) {
        // Actualizar timestamp de última verificación
        await supabase
          .from('profiles')
          .update({ last_totp_verification: new Date().toISOString() })
          .eq('user_id', userId)

        return {
          isValid: true,
          message: 'Código verificado exitosamente'
        }
      } else {
        return {
          isValid: false,
          message: 'Código inválido o expirado'
        }
      }
    } catch (error) {
      console.error('Error verifying TOTP:', error)
      return {
        isValid: false,
        message: 'Error al verificar el código'
      }
    }
  }

  /**
   * Deshabilita 2FA para un usuario
   */
  static async disableTOTP(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          totp_secret: null,
          totp_enabled: false,
          last_totp_verification: null
        })
        .eq('user_id', userId)

      return !error
    } catch (error) {
      console.error('Error disabling TOTP:', error)
      return false
    }
  }

  /**
   * Verifica si un usuario tiene 2FA habilitado
   */
  static async is2FAEnabled(userId: string): Promise<boolean> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('totp_enabled')
        .eq('user_id', userId)
        .single()

      return !error && profile?.totp_enabled === true
    } catch (error) {
      console.error('Error checking 2FA status:', error)
      return false
    }
  }

  /**
   * Verifica si la última verificación 2FA es reciente (para sesiones)
   */
  static async isRecentlyVerified(userId: string, maxAgeMinutes: number = 30): Promise<boolean> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('last_totp_verification')
        .eq('user_id', userId)
        .single()

      if (error || !profile?.last_totp_verification) return false

      const lastVerification = new Date(profile.last_totp_verification)
      const now = new Date()
      const diffMinutes = (now.getTime() - lastVerification.getTime()) / (1000 * 60)

      return diffMinutes <= maxAgeMinutes
    } catch (error) {
      console.error('Error checking recent verification:', error)
      return false
    }
  }

  /**
   * Genera códigos de respaldo (para implementación futura)
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = []
    
    for (let i = 0; i < count; i++) {
      // Generar código de 8 dígitos
      const code = Math.random().toString().substr(2, 8)
      codes.push(code)
    }
    
    return codes
  }
}