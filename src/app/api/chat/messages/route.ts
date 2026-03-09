import { NextRequest, NextResponse } from 'next/server'
import { getChatContext } from '@/lib/chat/server'
import { generateAssistantReply } from '../../../../lib/chat/openai'
import { SupportChatMessage } from '@/lib/chat/types'

function asksForTicketCountToday(userText: string): boolean {
  const normalized = userText.toLowerCase()
  const mentionsTickets = normalized.includes('ticket') || normalized.includes('tickets')
  const mentionsCount =
    normalized.includes('cuantos') ||
    normalized.includes('cantidad') ||
    normalized.includes('numero') ||
    normalized.includes('registrad')
  const mentionsToday = normalized.includes('hoy') || normalized.includes('dia de hoy')

  return mentionsTickets && mentionsCount && mentionsToday
}

function getBogotaDayRangeIso() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  if (!year || !month || !day) {
    const fallbackStart = new Date(now)
    fallbackStart.setUTCHours(0, 0, 0, 0)
    const fallbackEnd = new Date(fallbackStart)
    fallbackEnd.setUTCDate(fallbackEnd.getUTCDate() + 1)
    return {
      startIso: fallbackStart.toISOString(),
      endIso: fallbackEnd.toISOString(),
    }
  }

  const startIso = new Date(`${year}-${month}-${day}T00:00:00-05:00`).toISOString()
  const endIso = new Date(`${year}-${month}-${day}T23:59:59.999-05:00`).toISOString()

  return { startIso, endIso }
}

export async function GET(request: NextRequest) {
  const ctx = await getChatContext()
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const { admin, user, viewer } = ctx

  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId es obligatorio' }, { status: 400 })
  }

  const { data: session, error: sessionError } = await admin
    .from('support_chat_sessions')
    .select('id, client_user_id, assigned_agent_user_id, status')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
  }

  const canView =
    session.client_user_id === user.id ||
    viewer.canSupport ||
    session.assigned_agent_user_id === user.id

  if (!canView) {
    return NextResponse.json({ error: 'No autorizado para ver esta sesion' }, { status: 403 })
  }

  const { data: messages, error: messagesError } = await admin
    .from('support_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 })
  }

  return NextResponse.json({ messages: messages ?? [], session })
}

export async function POST(request: NextRequest) {
  const ctx = await getChatContext()
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const { admin, user, viewer, profile } = ctx

  const body = await request.json()
  const sessionId = body?.sessionId as string | undefined
  const content = (body?.content as string | undefined)?.trim()
  const actor = (body?.actor as 'client' | 'agent' | undefined) ?? 'client'

  if (!sessionId || !content) {
    return NextResponse.json({ error: 'sessionId y content son obligatorios' }, { status: 400 })
  }

  const { data: session, error: sessionError } = await admin
    .from('support_chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
  }

  const actingAsAgent = actor === 'agent'

  if (actingAsAgent) {
    if (!viewer.canSupport) {
      return NextResponse.json({ error: 'No autorizado para responder como soporte' }, { status: 403 })
    }

    if (
      session.assigned_agent_user_id &&
      session.assigned_agent_user_id !== user.id
    ) {
      return NextResponse.json({ error: 'Esta sesion ya fue tomada por otro agente' }, { status: 409 })
    }

    if (session.status === 'closed') {
      return NextResponse.json({ error: 'La sesion esta cerrada' }, { status: 409 })
    }

    const { error: assignError } = await admin
      .from('support_chat_sessions')
      .update({
        status: 'agent_connected',
        assigned_agent_user_id: user.id,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (assignError) {
      return NextResponse.json({ error: assignError.message }, { status: 500 })
    }

    const { data: agentMessage, error: agentError } = await admin
      .from('support_chat_messages')
      .insert({
        session_id: sessionId,
        sender_type: 'agent',
        sender_user_id: user.id,
        content,
      })
      .select('*')
      .single()

    if (agentError) {
      return NextResponse.json({ error: agentError.message }, { status: 500 })
    }

    return NextResponse.json({ message: agentMessage, sessionStatus: 'agent_connected' })
  }

  if (session.client_user_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado para escribir en esta sesion' }, { status: 403 })
  }

  if (session.status === 'closed') {
    return NextResponse.json({ error: 'La sesion esta cerrada' }, { status: 409 })
  }

  const { data: userMessage, error: userMessageError } = await admin
    .from('support_chat_messages')
    .insert({
      session_id: sessionId,
      sender_type: 'client',
      sender_user_id: user.id,
      content,
    })
    .select('*')
    .single()

  if (userMessageError) {
    return NextResponse.json({ error: userMessageError.message }, { status: 500 })
  }

  await admin
    .from('support_chat_sessions')
    .update({
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (session.status === 'waiting_agent' || session.status === 'agent_connected') {
    return NextResponse.json({ message: userMessage, assistantMessage: null, sessionStatus: session.status })
  }

  if (asksForTicketCountToday(content)) {
    if (!viewer.canSupport) {
      const permissionReply =
        'Puedo ayudarte con temas de mesa de ayuda, pero la metrica de tickets de hoy solo esta disponible para roles de soporte (agente, lider o administrador).'

      const { data: permissionMessage } = await admin
        .from('support_chat_messages')
        .insert({
          session_id: sessionId,
          sender_type: 'assistant',
          content: permissionReply,
          metadata: {
            source: 'ticket-metric-permission',
          },
        })
        .select('*')
        .single()

      return NextResponse.json({
        message: userMessage,
        assistantMessage: permissionMessage ?? null,
        sessionStatus: 'bot',
      })
    }

    const { startIso, endIso } = getBogotaDayRangeIso()
    const { count, error: countError } = await admin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startIso)
      .lte('created_at', endIso)

    const total = countError ? null : (count ?? 0)
    const metricReply = countError
      ? 'No pude consultar el total de tickets de hoy en este momento. Intenta nuevamente en unos segundos.'
      : `Hasta ahora se han registrado ${total} ticket(s) hoy.`

    const { data: metricMessage } = await admin
      .from('support_chat_messages')
      .insert({
        session_id: sessionId,
        sender_type: 'assistant',
        content: metricReply,
        metadata: {
          source: 'ticket-metric-today',
          range_start: startIso,
          range_end: endIso,
        },
      })
      .select('*')
      .single()

    return NextResponse.json({
      message: userMessage,
      assistantMessage: metricMessage ?? null,
      sessionStatus: 'bot',
    })
  }

  const { data: previousMessages } = await admin
    .from('support_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  const assistantText = await generateAssistantReply({
    userText: content,
    messages: (previousMessages ?? []) as SupportChatMessage[],
    context: {
      companyName: process.env.NEXT_PUBLIC_CLIENT_NAME || 'Silverlight Colombia',
      supportProviderName: 'Silverlight Colombia',
      appName: 'Solven - Sistema de Gestion Integral',
      scope: 'Mesa de ayuda TI empresarial',
      modules: [
        'Dashboard',
        'Tickets',
        'Hardware',
        'Software',
        'Accesos',
        'Reportes',
        'Actas',
        'Usuarios',
      ],
      userRole: profile.role,
    },
  })

  const { data: assistantMessage, error: assistantError } = await admin
    .from('support_chat_messages')
    .insert({
      session_id: sessionId,
      sender_type: 'assistant',
      content: assistantText,
      metadata: {
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      },
    })
    .select('*')
    .single()

  if (assistantError) {
    return NextResponse.json({ error: assistantError.message }, { status: 500 })
  }

  await admin
    .from('support_chat_sessions')
    .update({
      status: 'bot',
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  return NextResponse.json({
    message: userMessage,
    assistantMessage,
    sessionStatus: 'bot',
  })
}
