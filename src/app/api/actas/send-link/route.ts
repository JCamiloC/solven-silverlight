import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

type Body = {
  to: string
  signingUrl: string
  hardwareName?: string
  clientName?: string
  recipientName?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body

    if (!body?.to || !body?.signingUrl) {
      return NextResponse.json({ error: 'to y signingUrl son requeridos' }, { status: 400 })
    }

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = Number(process.env.SMTP_PORT || '587')
    const smtpSecure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const fromEmail = process.env.SMTP_FROM_EMAIL

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !fromEmail) {
      return NextResponse.json(
        { error: 'No está configurado el servicio de correo SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL)' },
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

    const subject = `Firma de acta de entrega${body.hardwareName ? ` - ${body.hardwareName}` : ''}`
    const recipient = body.recipientName || 'Usuario'
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin-bottom: 8px;">Acta de entrega pendiente de firma</h2>
        <p>Hola ${recipient},</p>
        <p>
          Se ha generado una solicitud para firmar el acta de entrega
          ${body.hardwareName ? ` del equipo <strong>${body.hardwareName}</strong>` : ''}
          ${body.clientName ? ` para <strong>${body.clientName}</strong>` : ''}.
        </p>
        <p>Ingresa al siguiente enlace para completar la firma:</p>
        <p>
          <a href="${body.signingUrl}" style="color: #2563eb;">${body.signingUrl}</a>
        </p>
        <p>Este enlace es de acceso público y está destinado únicamente al responsable de recepción.</p>
      </div>
    `

    await transporter.sendMail({
      from: fromEmail,
      to: body.to,
      subject,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}
