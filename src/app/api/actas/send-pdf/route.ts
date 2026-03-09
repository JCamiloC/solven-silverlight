import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

import { createClient } from '@/lib/supabase/server'

type Body = {
  to: string | string[]
  bcc?: string | string[]
  pdfBase64: string
  fileName?: string
  hardwareName?: string
  clientName?: string
  recipientName?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmails(input?: string | string[]) {
  const values = Array.isArray(input) ? input : typeof input === 'string' ? [input] : []

  return Array.from(
    new Set(
      values
        .map((email) => email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email && EMAIL_REGEX.test(email)))
    )
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = (await request.json()) as Body

    if (!body?.to || !body?.pdfBase64) {
      return NextResponse.json(
        { error: 'to y pdfBase64 son requeridos' },
        { status: 400 }
      )
    }

    const toRecipients = normalizeEmails(body.to)
    const bccRecipients = normalizeEmails(body.bcc).filter(
      (email) => !toRecipients.includes(email)
    )

    if (toRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No hay destinatarios principales con formato de correo válido' },
        { status: 400 }
      )
    }

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = Number(process.env.SMTP_PORT || '587')
    const smtpSecure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const fromEmail = process.env.SMTP_FROM_EMAIL

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !fromEmail) {
      return NextResponse.json(
        {
          error:
            'No está configurado el servicio de correo SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL)',
        },
        { status: 500 }
      )
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    const filename =
      body.fileName?.trim() ||
      `ActaEntrega_${(body.hardwareName || 'Equipo').replace(/\s+/g, '_')}.pdf`

    const subject = `Acta de entrega${body.hardwareName ? ` - ${body.hardwareName}` : ''}`
    const recipient = body.recipientName || 'usuario'

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin-bottom: 8px;">Acta de entrega adjunta</h2>
        <p>Hola ${recipient},</p>
        <p>
          Se adjunta el acta de entrega
          ${body.hardwareName ? ` del equipo <strong>${body.hardwareName}</strong>` : ''}
          ${body.clientName ? ` para <strong>${body.clientName}</strong>` : ''}.
        </p>
        <p>Este correo fue generado desde el sistema Mesa de Ayuda.</p>
      </div>
    `

    await transporter.sendMail({
      from: fromEmail,
      to: toRecipients.join(','),
      bcc: bccRecipients.length ? bccRecipients.join(',') : undefined,
      subject,
      html,
      attachments: [
        {
          filename,
          content: Buffer.from(body.pdfBase64, 'base64'),
          contentType: 'application/pdf',
        },
      ],
    })

    return NextResponse.json({ ok: true, recipients: { to: toRecipients, bcc: bccRecipients } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}
