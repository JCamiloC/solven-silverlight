import { SupportChatMessage } from './types'

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
const OPENAI_TIMEOUT_MS = 18000
const SUPPORT_EMAIL = process.env.SUPPORT_CONTACT_EMAIL || 'No configurado'
const SUPPORT_PHONE = process.env.SUPPORT_CONTACT_PHONE || 'No configurado'
const SUPPORT_WHATSAPP = process.env.SUPPORT_CONTACT_WHATSAPP || 'No configurado'

interface ChatAppContext {
  companyName: string
  supportProviderName: string
  appName: string
  scope: string
  modules: string[]
  userRole: string | null
}

function wantsSupportContact(userText: string): boolean {
  const normalized = userText.toLowerCase()
  return [
    'contact',
    'soporte',
    'telefono',
    'tel',
    'correo',
    'email',
    'whatsapp',
    'comunicar',
  ].some((term) => normalized.includes(term))
}

function supportContactReply(): string {
  return [
    'Claro. Estos son los canales oficiales de soporte configurados para Solven:',
    `Telefono: ${SUPPORT_PHONE}`,
    `Correo: ${SUPPORT_EMAIL}`,
    `WhatsApp: ${SUPPORT_WHATSAPP}`,
  ].join('\n')
}

function fallbackReply(userText: string): string {
  if (wantsSupportContact(userText)) {
    return supportContactReply()
  }

  return `Recibido: "${userText}". Si deseas, te ayudo a escalar con un agente humano de ${process.env.NEXT_PUBLIC_CLIENT_NAME || 'Silverlight Colombia'}.`
}

function buildSystemPrompt(context: ChatAppContext): string {
  return [
    `Eres el asistente virtual de mesa de ayuda de ${context.appName}.`,
    `La empresa que brinda el soporte es ${context.supportProviderName}.`,
    `Empresa cliente actual: ${context.companyName}.`,
    `Rol del usuario autenticado: ${context.userRole || 'sin-rol'}.`,
    '',
    'Alcance estricto de temas permitidos:',
    `- ${context.scope}`,
    `- Modulos: ${context.modules.join(', ')}`,
    '- Procesos de soporte tecnico, incidentes, solicitudes y escalamiento humano.',
    '',
    'Reglas de respuesta:',
    '- No salirte a temas ajenos a mesa de ayuda TI.',
    '- Si piden algo fuera de alcance, redirige a soporte de forma breve.',
    '- No inventar datos de contacto, rutas, modulos o capacidades.',
    '- Si piden contacto, usar solo estos canales:',
    `  Telefono: ${SUPPORT_PHONE}`,
    `  Correo: ${SUPPORT_EMAIL}`,
    `  WhatsApp: ${SUPPORT_WHATSAPP}`,
    '- Mantener respuestas claras y cortas en espanol.',
  ].join('\n')
}

export async function generateAssistantReply(input: {
  userText: string
  messages: SupportChatMessage[]
  context: ChatAppContext
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return fallbackReply(input.userText)
  }

  const prompt = [
    {
      role: 'system',
      content: buildSystemPrompt(input.context),
    },
    ...input.messages.slice(-12).map((message) => ({
      role:
        message.sender_type === 'assistant'
          ? 'assistant'
          : message.sender_type === 'agent'
            ? 'assistant'
            : 'user',
      content: message.content,
    })),
    {
      role: 'user',
      content: input.userText,
    },
  ]

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS)

  let response: Response

  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt,
        temperature: 0.3,
      }),
      signal: controller.signal,
    })
  } catch {
    clearTimeout(timeout)
    return fallbackReply(input.userText)
  }

  clearTimeout(timeout)

  if (!response.ok) {
    return fallbackReply(input.userText)
  }

  const data = (await response.json()) as {
    output_text?: string
    output?: Array<{
      content?: Array<{ text?: string; type?: string }>
      type?: string
    }>
  }

  if (typeof data.output_text === 'string' && data.output_text.trim().length > 0) {
    if (wantsSupportContact(input.userText)) {
      return supportContactReply()
    }

    return data.output_text.trim()
  }

  for (const outputItem of data.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (typeof contentItem.text === 'string' && contentItem.text.trim().length > 0) {
        if (wantsSupportContact(input.userText)) {
          return supportContactReply()
        }

        return contentItem.text.trim()
      }
    }
  }

  return fallbackReply(input.userText)
}
