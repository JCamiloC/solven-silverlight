import CryptoJS from 'crypto-js'

// Clave de encriptación - DEBE estar en variables de entorno
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'fallback-key-for-dev-only'

export class CryptoService {
  /**
   * Encripta una cadena de texto usando AES-256
   */
  static encrypt(text: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString()
      return encrypted
    } catch (error) {
      console.error('Error encrypting data:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Desencripta una cadena de texto
   */
  static decrypt(encryptedText: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY)
      const decrypted = bytes.toString(CryptoJS.enc.Utf8)
      
      if (!decrypted) {
        throw new Error('Failed to decrypt - invalid key or corrupted data')
      }
      
      return decrypted
    } catch (error) {
      console.error('Error decrypting data:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Genera un hash seguro para verificación
   */
  static hash(text: string): string {
    return CryptoJS.SHA256(text).toString()
  }

  /**
   * Verifica si un texto coincide con su hash
   */
  static verifyHash(text: string, hash: string): boolean {
    return this.hash(text) === hash
  }

  /**
   * Genera una clave aleatoria para encriptación
   */
  static generateKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString()
  }

  /**
   * Verifica si los datos pueden ser desencriptados
   */
  static canDecrypt(encryptedText: string): boolean {
    try {
      this.decrypt(encryptedText)
      return true
    } catch {
      return false
    }
  }
}

// Utility functions for password strength validation
export class PasswordService {
  /**
   * Valida la fortaleza de una contraseña
   */
  static validateStrength(password: string): {
    score: number
    feedback: string[]
    isStrong: boolean
  } {
    const feedback: string[] = []
    let score = 0

    // Longitud
    if (password.length >= 12) {
      score += 25
    } else if (password.length >= 8) {
      score += 15
    } else {
      feedback.push('La contraseña debe tener al menos 8 caracteres')
    }

    // Mayúsculas
    if (/[A-Z]/.test(password)) {
      score += 15
    } else {
      feedback.push('Incluir al menos una letra mayúscula')
    }

    // Minúsculas
    if (/[a-z]/.test(password)) {
      score += 15
    } else {
      feedback.push('Incluir al menos una letra minúscula')
    }

    // Números
    if (/\d/.test(password)) {
      score += 15
    } else {
      feedback.push('Incluir al menos un número')
    }

    // Caracteres especiales
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 20
    } else {
      feedback.push('Incluir al menos un carácter especial')
    }

    // Patrones comunes
    if (!/(.)\1{2,}/.test(password)) {
      score += 10
    } else {
      feedback.push('Evitar repetir el mismo carácter más de 2 veces')
    }

    return {
      score,
      feedback,
      isStrong: score >= 80
    }
  }

  /**
   * Genera una contraseña segura
   */
  static generateSecure(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    const allChars = lowercase + uppercase + numbers + symbols
    let password = ''
    
    // Asegurar al menos un carácter de cada tipo
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += symbols[Math.floor(Math.random() * symbols.length)]
    
    // Completar la longitud
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    // Mezclar los caracteres
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }
}