import { NextResponse } from 'next/server'
import { getChatContext } from '@/lib/chat/server'

async function resolveCurrentSession() {
  const ctx = await getChatContext()
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const { admin, user, profile, viewer } = ctx

  const { data: existing, error: existingError } = await admin
    .from('support_chat_sessions')
    .select('*')
    .eq('client_user_id', user.id)
    .neq('status', 'closed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ session: existing, viewer })
  }

  const { data: created, error: createError } = await admin
    .from('support_chat_sessions')
    .insert({
      client_user_id: user.id,
      client_profile_id: profile.id,
      client_id: profile.client_id ?? null,
      status: 'bot',
    })
    .select('*')
    .single()

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  return NextResponse.json({ session: created, viewer })
}

export async function GET() {
  return resolveCurrentSession()
}

export async function POST() {
  return resolveCurrentSession()
}
