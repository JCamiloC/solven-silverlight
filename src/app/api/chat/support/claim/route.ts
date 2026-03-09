import { NextRequest, NextResponse } from 'next/server'
import { getChatContext } from '@/lib/chat/server'

export async function POST(request: NextRequest) {
  const ctx = await getChatContext()
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const { admin, user, profile, viewer } = ctx

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
    .select('id, status, assigned_agent_user_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
  }

  if (session.status === 'closed') {
    return NextResponse.json({ error: 'La sesion ya esta cerrada' }, { status: 409 })
  }

  if (session.assigned_agent_user_id && session.assigned_agent_user_id !== user.id) {
    return NextResponse.json({ error: 'Ya fue tomada por otro agente' }, { status: 409 })
  }

  const now = new Date().toISOString()

  const { data: updated, error: updateError } = await admin
    .from('support_chat_sessions')
    .update({
      status: 'agent_connected',
      assigned_agent_user_id: user.id,
      assigned_agent_profile_id: profile.id,
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
    content: 'Un agente de soporte se unio al chat.',
  })

  return NextResponse.json({ session: updated })
}
