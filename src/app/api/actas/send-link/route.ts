import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/mailer'
import { createClient } from '@/lib/supabase/server'

type Body = {
  to: string
  signingUrl: string
  hardwareName?: string
  clientName?: string
  recipientName?: string
  /** Token del link (UUID en hardware_actas.link_temporal) para actualizar estado de envío */
  token?: string
  /** Id del acta; alternativo al token */
  actaId?: string
  /** Correo del técnico que envió (confirmación + aviso al firmar) */
  staffNotifyEmail?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email?: string) {
  return Boolean(email && EMAIL_REGEX.test(email.trim()))
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body

    if (!body?.to || !body?.signingUrl) {
      return NextResponse.json({ error: 'to y signingUrl son requeridos' }, { status: 400 })
    }

    if (!isValidEmail(body.to)) {
      return NextResponse.json({ error: 'Correo del destinatario inválido' }, { status: 400 })
    }

    // Preferimos sesión del técnico (si existe) para staffNotifyEmail
    let staffEmail = body.staffNotifyEmail?.trim().toLowerCase() || ''
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email) {
        staffEmail = user.email.trim().toLowerCase()
      }
    } catch {
      // endpoint usable con staffNotifyEmail del body si no hay cookie
    }

    if (staffEmail && !isValidEmail(staffEmail)) {
      staffEmail = ''
    }

    const recipient = body.recipientName || 'Usuario'
    const hardwareLabel = body.hardwareName || 'equipo'
    const clientLabel = body.clientName ? ` para <strong>${body.clientName}</strong>` : ''

    const clientHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin-bottom: 8px;">Acta de entrega pendiente de firma</h2>
        <p>Hola ${recipient},</p>
        <p>
          Se ha generado una solicitud para firmar el acta de entrega del equipo
          <strong>${hardwareLabel}</strong>${clientLabel}.
        </p>
        <p>Ingresa al siguiente enlace para completar la firma (no necesitas una cuenta):</p>
        <p>
          <a href="${body.signingUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
            Firmar acta de entrega
          </a>
        </p>
        <p style="font-size: 13px; color: #4b5563;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
          <a href="${body.signingUrl}" style="color: #2563eb;">${body.signingUrl}</a>
        </p>
        <p style="font-size: 12px; color: #6b7280;">
          Este enlace es de acceso público y está destinado únicamente al responsable de recepción.
        </p>
      </div>
    `

    await sendMail({
      to: body.to.trim(),
      subject: `Firma de acta de entrega - ${hardwareLabel}`,
      html: clientHtml,
    })

    if (staffEmail && staffEmail !== body.to.trim().toLowerCase()) {
      const staffHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <h2 style="margin-bottom: 8px;">Confirmación: link de firma enviado</h2>
          <p>Hola,</p>
          <p>
            Se envió correctamente el link de firma del acta de entrega de
            <strong>${hardwareLabel}</strong> a <strong>${body.to.trim()}</strong>
            ${body.recipientName ? `(${body.recipientName})` : ''}.
          </p>
          <p><strong>Estado:</strong> Falta firma del cliente.</p>
          <p>Puedes verificar el mismo enlace aquí:</p>
          <p>
            <a href="${body.signingUrl}" style="color: #2563eb;">${body.signingUrl}</a>
          </p>
          <p style="font-size: 12px; color: #6b7280;">
            Recibirás otro correo cuando el cliente complete la firma.
          </p>
        </div>
      `

      try {
        await sendMail({
          to: staffEmail,
          subject: `✓ Link de firma enviado - ${hardwareLabel}`,
          html: staffHtml,
        })
      } catch (staffMailError) {
        console.error('[actas/send-link] staff confirmation failed:', staffMailError)
      }
    }

    // Actualizar seguimiento en DB si tenemos token o id
    const admin = createAdminClient()
    const now = new Date().toISOString()
    const tracking: Record<string, unknown> = {
      enviado_a: body.to.trim(),
      enviado_en: now,
      actualizado_en: now,
      estado_firma: 'falta_cliente',
    }
    if (staffEmail) {
      tracking.staff_notify_email = staffEmail
    }

    if (body.actaId) {
      await admin.from('hardware_actas').update(tracking).eq('id', body.actaId)
    } else if (body.token) {
      await admin.from('hardware_actas').update(tracking).eq('link_temporal', body.token)
    } else {
      // Derivar token del URL: .../actas/<token>
      const match = body.signingUrl.match(/\/actas\/([a-f0-9-]{36}|[A-Za-z0-9_-]+)/i)
      if (match?.[1]) {
        await admin.from('hardware_actas').update(tracking).eq('link_temporal', match[1])
      }
    }

    return NextResponse.json({ ok: true, staffNotified: Boolean(staffEmail) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}
