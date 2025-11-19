import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL deben estar configurados en el servidor')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    // Filtrar usuarios que no han confirmado su email
    const pending = data.users.filter(user => !user.email_confirmed_at)
    return NextResponse.json(pending)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
