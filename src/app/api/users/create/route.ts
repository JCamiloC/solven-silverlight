import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UserRole } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del usuario actual
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('🔍 Verificando autenticación...')
    console.log('Usuario:', user?.id)
    console.log('Error de auth:', authError)

    if (authError || !user) {
      console.error('❌ No autorizado - No hay usuario autenticado')
      return NextResponse.json(
        { error: 'No autorizado', details: authError?.message },
        { status: 401 }
      )
    }

    // Verificar que el usuario sea administrador
    console.log('🔍 Verificando rol de administrador...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    console.log('Perfil encontrado:', profile)
    console.log('Error de perfil:', profileError)

    if (!profile || profile.role !== 'administrador') {
      console.error('❌ Usuario no es administrador:', profile?.role)
      return NextResponse.json(
        { error: 'No tienes permisos para crear usuarios' },
        { status: 403 }
      )
    }

    // Obtener datos del body
    const body = await request.json()
    const { email, password, first_name, last_name, role, phone } = body

    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json(
        { error: 'Email, password, nombre, apellido y rol son requeridos' },
        { status: 400 }
      )
    }

    // Crear usuario con cliente administrativo
    const adminClient = createAdminClient()
    
    // Crear usuario en auth.users
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente para usuarios creados por admin
      user_metadata: {
        first_name,
        last_name,
        role,
        totp_enabled: false, // Indicar que no tiene 2FA habilitado inicialmente
      }
    })

    if (createError) {
      console.error('Error creando usuario en Auth:', createError)
      return NextResponse.json(
        { error: `Error al crear usuario: ${createError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'No se pudo crear el usuario' },
        { status: 500 }
      )
    }

    console.log('✅ Usuario creado en Auth:', authData.user.id)

    // Verificar si ya existe un perfil (puede ser creado automáticamente por un trigger)
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    let profileData

    if (existingProfile) {
      // Si ya existe, actualizar el perfil
      console.log('📝 Perfil ya existe, actualizando...')
      const { data: updatedProfile, error: updateError } = await adminClient
        .from('profiles')
        .update({
          email: email,
          first_name,
          last_name,
          phone: phone || null,
          role: role as UserRole,
        })
        .eq('user_id', authData.user.id)
        .select('*')
        .single()

      if (updateError) {
        console.error('Error actualizando perfil:', updateError)
        await adminClient.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { error: `Error al actualizar perfil: ${updateError.message}` },
          { status: 500 }
        )
      }

      profileData = updatedProfile
    } else {
      // Si no existe, crear el perfil
      console.log('➕ Creando nuevo perfil...')
      const { data: newProfile, error: createProfileError } = await adminClient
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: email,
          first_name,
          last_name,
          phone: phone || null,
          role: role as UserRole,
        })
        .select('*')
        .single()

      if (createProfileError) {
        console.error('Error creando perfil:', createProfileError)
        await adminClient.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { error: `Error al crear perfil: ${createProfileError.message}` },
          { status: 500 }
        )
      }

      profileData = newProfile
    }

    return NextResponse.json({
      success: true,
      user: profileData
    })

  } catch (error) {
    console.error('Error en API de creación de usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
