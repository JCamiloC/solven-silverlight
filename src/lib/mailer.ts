import nodemailer from 'nodemailer'

export type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

function resolveSmtpFromAddress(smtpUser: string): string | null {
  const explicit = process.env.SMTP_FROM_EMAIL?.trim()
  if (explicit) return explicit

  const legacy = process.env.SMTP_FROM?.trim()
  if (legacy) {
    const angle = legacy.match(/<([^>]+)>/)
    if (angle?.[1]) return angle[1].trim()
    return legacy
  }

  // Misma cuenta que ya tiene SMTP (p. ej. desarrollo@silverlight.com.co)
  if (smtpUser) return smtpUser
  return null
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || '587')
  const secure = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD
  const from = user ? resolveSmtpFromAddress(user) : null

  if (!host || !user || !pass || !from) return null

  return { host, port, secure, user, pass, from }
}

export function createMailTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
}

export async function sendMail(options: {
  to: string | string[]
  subject: string
  html: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}) {
  const config = getSmtpConfig()
  if (!config) {
    throw new Error(
      'No está configurado el servicio de correo SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL)'
    )
  }

  const transporter = createMailTransporter(config)
  await transporter.sendMail({
    from: config.from,
    to: Array.isArray(options.to) ? options.to.join(',') : options.to,
    cc: options.cc
      ? Array.isArray(options.cc)
        ? options.cc.join(',')
        : options.cc
      : undefined,
    bcc: options.bcc
      ? Array.isArray(options.bcc)
        ? options.bcc.join(',')
        : options.bcc
      : undefined,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  })
}
