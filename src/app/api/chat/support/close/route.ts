import { NextRequest, NextResponse } from 'next/server'
import { getChatContext } from '@/lib/chat/server'

export async function POST(request: NextRequest) {
  const ctx = await getChatContext()
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const { admin, user, viewer } = ctx

  if (!viewer.canSupport) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const sessionId = body?.sessionId as string | undefined

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId es obligatorio' }, { status: 400 })
  }

  const { data: session, error: sessionError } = await admin
    .from('support_chat_sessions')
    .select('id, assigned_agent_user_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
  }

  if (session.assigned_agent_user_id && session.assigned_agent_user_id !== user.id) {
    return NextResponse.json({ error: 'Solo el agente asignado puede cerrar' }, { status: 403 })
  }

  const { data: closed, error: closeError } = await admin
    .from('support_chat_sessions')
    .update({
      status: 'closed',
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select('*')
    .single()

  if (closeError) {
    return NextResponse.json({ error: closeError.message }, { status: 500 })
  }

  await admin.from('support_chat_messages').insert({
    session_id: sessionId,
    sender_type: 'system',
    content: 'La conversacion fue cerrada por soporte.',
  })

  return NextResponse.json({ session: closed })
}
