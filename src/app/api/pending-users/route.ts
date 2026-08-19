import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const pending = data.users.filter(user => !user.email_confirmed_at)
    return NextResponse.json(pending)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
