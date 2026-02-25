import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Payload = {
  token?: string
  cliente_nombre?: string
  cliente_cedula?: string
  cliente_firma_dataurl?: string | null
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string } {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!match) {
    throw new Error('Formato de firma inválido')
  }

  const mime = match[1]
  const base64 = match[2]
  return { buffer: Buffer.from(base64, 'base64'), mime }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Payload

    const token = body.token?.trim()
    const clienteNombre = body.cliente_nombre?.trim()
    const clienteCedula = body.cliente_cedula?.trim()

    if (!token || !clienteNombre || !clienteCedula) {
      return NextResponse.json(
        { error: 'token, cliente_nombre y cliente_cedula son obligatorios' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    const { data: acta, error: findError } = await admin
      .from('hardware_actas')
      .select('*')
      .eq('link_temporal', token)
      .maybeSingle()

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    if (!acta) {
      return NextResponse.json({ error: 'No se encontró acta para ese link' }, { status: 404 })
    }

    let clienteFirmaUrl: string | null = acta.cliente_firma_url || null

    if (body.cliente_firma_dataurl) {
      const { buffer, mime } = dataUrlToBuffer(body.cliente_firma_dataurl)
      const fileExt = mime.includes('png') ? 'png' : 'jpg'
      const path = `public/${acta.id}/cliente.${fileExt}`

      const upload = await admin.storage
        .from('actas')
        .upload(path, buffer, { upsert: true, contentType: mime })

      if (upload.error) {
        return NextResponse.json({ error: upload.error.message }, { status: 500 })
      }

      clienteFirmaUrl = admin.storage.from('actas').getPublicUrl(path).data?.publicUrl || null
    }

    const { data: updated, error: updateError } = await admin
      .from('hardware_actas')
      .update({
        cliente_nombre: clienteNombre,
        cliente_cedula: clienteCedula,
        cliente_firma_url: clienteFirmaUrl,
        estado_firma: 'completo',
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', acta.id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
