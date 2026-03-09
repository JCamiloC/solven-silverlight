import { NextRequest, NextResponse } from 'next/server'
import { getChatContext } from '@/lib/chat/server'

export async function POST(request: NextRequest) {
  const ctx = await getChatContext()
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const { admin, user } = ctx
  const body = await request.json()
  const sessionId = body?.sessionId as string | undefined

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId es obligatorio' }, { status: 400 })
  }

  const { data: session, error: sessionError } = await admin
    .from('support_chat_sessions')
    .select('id, client_user_id, status')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
  }

  if (session.client_user_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (session.status === 'closed') {
    return NextResponse.json({ error: 'La sesion esta cerrada' }, { status: 409 })
  }

  const now = new Date().toISOString()

  const { data: updatedSession, error: updateError } = await admin
    .from('support_chat_sessions')
    .update({
      status: 'waiting_agent',
      human_requested_at: now,
      last_message_at: now,
    })
    .eq('id', sessionId)
    .select('*')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await admin.from('support_chat_messages').insert({
    session_id: sessionId,
    sender_type: 'system',
    content: 'El cliente solicito hablar con un agente de soporte humano.',
  })

  return NextResponse.json({ session: updatedSession })
}
