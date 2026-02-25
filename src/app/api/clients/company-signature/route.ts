import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Payload = {
  clientId: string
  nombre: string
  cedula: string
  signatureDataUrl?: string | null
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string; ext: string } {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!match) throw new Error('Formato de firma inválido')

  const mime = match[1]
  const base64 = match[2]
  const buffer = Buffer.from(base64, 'base64')
  const ext = mime.includes('png') ? 'png' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'bin'

  return { buffer, mime, ext }
}

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
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'No se pudo validar el perfil' }, { status: 403 })
    }

    if (!['administrador', 'lider_soporte', 'agente_soporte'].includes(profile.role)) {
      return NextResponse.json({ error: 'No tienes permisos para registrar firma de empresa' }, { status: 403 })
    }

    const body = (await request.json()) as Payload

    if (!body.clientId || !body.nombre?.trim() || !body.cedula?.trim()) {
      return NextResponse.json({ error: 'clientId, nombre y cedula son obligatorios' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: client, error: clientError } = await admin
      .from('clients')
      .select('id, acta_generador_firma_url')
      .eq('id', body.clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    let firmaUrl = client.acta_generador_firma_url || null

    if (body.signatureDataUrl) {
      const { buffer, mime, ext } = dataUrlToBuffer(body.signatureDataUrl)
      const path = `public/client-signatures/${body.clientId}/generador.${ext}`

      const upload = await admin.storage
        .from('actas')
        .upload(path, buffer, { upsert: true, contentType: mime })

      if (upload.error) {
        return NextResponse.json({ error: upload.error.message }, { status: 500 })
      }

      firmaUrl = admin.storage.from('actas').getPublicUrl(path).data?.publicUrl || null
    }

    if (!firmaUrl) {
      return NextResponse.json(
        { error: 'Debes dibujar una firma para registrar por primera vez' },
        { status: 400 }
      )
    }

    const { data: updated, error: updateError } = await admin
      .from('clients')
      .update({
        acta_generador_nombre: body.nombre.trim(),
        acta_generador_cedula: body.cedula.trim(),
        acta_generador_firma_url: firmaUrl,
        acta_generador_actualizado_en: new Date().toISOString(),
      })
      .eq('id', body.clientId)
      .select('id, acta_generador_nombre, acta_generador_cedula, acta_generador_firma_url, acta_generador_actualizado_en')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data: updated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
