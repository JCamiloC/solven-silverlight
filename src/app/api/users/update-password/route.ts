import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'administrador') {
      return NextResponse.json(
        { error: 'No tienes permisos para actualizar contraseñas' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const profileId = typeof body.profile_id === 'string' ? body.profile_id : ''
    const password = typeof body.password === 'string' ? body.password.trim() : ''

    if (!profileId || !password) {
      return NextResponse.json(
        { error: 'El perfil y la contraseña son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('id', profileId)
      .single()

    if (targetProfileError || !targetProfile?.user_id) {
      return NextResponse.json(
        { error: 'No se encontró el usuario a actualizar' },
        { status: 404 }
      )
    }

    const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(
      targetProfile.user_id,
      { password }
    )

    if (updatePasswordError) {
      return NextResponse.json(
        { error: `Error al actualizar contraseña: ${updatePasswordError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en API de actualización de contraseña:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
