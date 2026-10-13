import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchAlertDigests } from '@/lib/alerts/dispatch-alert-digests'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV === 'development'

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  const header = request.headers.get('x-cron-secret')
  return header === secret
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const result = await dispatchAlertDigests(admin)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[cron/expiry-notifications]', error)
    const message = error instanceof Error ? error.message : 'Error en cron'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
