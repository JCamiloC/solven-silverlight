import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/mailer'

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

    if (!body.cliente_firma_dataurl) {
      return NextResponse.json({ error: 'La firma es obligatoria' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: acta, error: findError } = await admin
      .from('hardware_actas')
      .select(
        `
        *,
        hardware_assets (
          id,
          name,
          serial_number,
          persona_responsable,
          correo_responsable
        )
      `
      )
      .eq('link_temporal', token)
      .maybeSingle()

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    if (!acta) {
      return NextResponse.json({ error: 'No se encontró acta para ese link' }, { status: 404 })
    }

    if (acta.estado_firma === 'completo' && acta.cliente_firma_url) {
      return NextResponse.json({
        ...acta,
        alreadySigned: true,
        message: 'Esta acta ya fue firmada',
      })
    }

    const { buffer, mime } = dataUrlToBuffer(body.cliente_firma_dataurl)
    const fileExt = mime.includes('png') ? 'png' : 'jpg'
    const path = `public/${acta.id}/cliente.${fileExt}`

    const upload = await admin.storage
      .from('actas')
      .upload(path, buffer, { upsert: true, contentType: mime })

    if (upload.error) {
      return NextResponse.json({ error: upload.error.message }, { status: 500 })
    }

    const clienteFirmaUrl =
      admin.storage.from('actas').getPublicUrl(path).data?.publicUrl || null

    const firmadoEn = new Date().toISOString()

    const { data: updated, error: updateError } = await admin
      .from('hardware_actas')
      .update({
        cliente_nombre: clienteNombre,
        cliente_cedula: clienteCedula,
        cliente_firma_url: clienteFirmaUrl,
        estado_firma: 'completo',
        firmado_en: firmadoEn,
        actualizado_en: firmadoEn,
      })
      .eq('id', acta.id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const hardware = Array.isArray(acta.hardware_assets)
      ? acta.hardware_assets[0]
      : acta.hardware_assets
    const hardwareName = hardware?.name || 'equipo'
    const notifyTo = (acta.staff_notify_email || '').trim()

    if (notifyTo) {
      const origin =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        (request.nextUrl?.origin ?? '')
      const signingUrl = origin
        ? `${origin.replace(/\/$/, '')}/actas/${token}`
        : ''

      try {
        await sendMail({
          to: notifyTo,
          subject: `✓ Acta firmada por el cliente - ${hardwareName}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
              <h2 style="margin-bottom: 8px;">El cliente firmó el acta de entrega</h2>
              <p>Hola,</p>
              <p>
                <strong>${clienteNombre}</strong> (cédula ${clienteCedula}) firmó el acta
                de entrega de <strong>${hardwareName}</strong>.
              </p>
              <p><strong>Estado:</strong> Completa (firmada por el cliente).</p>
              <p>Ya puedes descargar o enviar el PDF del acta desde el módulo de hardware.</p>
              ${
                signingUrl
                  ? `<p style="font-size: 12px; color: #6b7280;">Link del acta: <a href="${signingUrl}">${signingUrl}</a></p>`
                  : ''
              }
            </div>
          `,
        })
      } catch (mailError) {
        console.error('[actas/sign-public] staff notification failed:', mailError)
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
