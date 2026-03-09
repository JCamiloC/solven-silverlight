import { NextResponse } from 'next/server'
import { getChatContext } from '@/lib/chat/server'

export async function GET() {
  const ctx = await getChatContext()
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const { admin, user, viewer } = ctx

  if (!viewer.canSupport) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data: sessions, error } = await admin
    .from('support_chat_sessions')
    .select(
      `
      *,
      client_profile:client_profile_id(first_name, last_name, email),
      agent_profile:assigned_agent_profile_id(first_name, last_name)
    `
    )
    .in('status', ['bot', 'waiting_agent', 'agent_connected'])
    .order('human_requested_at', { ascending: true, nullsFirst: false })
    .order('last_message_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const queue = (sessions ?? []).map((session) => ({
    ...session,
    isMine: session.assigned_agent_user_id === user.id,
    isUnassigned: !session.assigned_agent_user_id,
  }))

  return NextResponse.json({ queue })
}
