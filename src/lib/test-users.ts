/**
 * Prueba rápida de conexión a Supabase para usuarios
 */
import { UsersService } from '@/lib/services/users'

async function testSupabaseConnection() {
  console.log('🔍 Probando conexión a Supabase...')
  
  try {
    const users = await UsersService.getAll()
    console.log('✅ Conexión exitosa!')
    console.log('👥 Usuarios encontrados:', users.length)
    console.log('📄 Primer usuario:', users[0])
    
    return users
  } catch (error) {
    console.error('❌ Error de conexión:', error)
    return []
  }
}

// Solo para testing
if (typeof window !== 'undefined') {
  (window as any).testUsers = testSupabaseConnection
}

export { testSupabaseConnection }