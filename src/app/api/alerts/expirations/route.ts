import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildExpirationAlerts } from '@/lib/alerts/build-expiration-alerts'
import { resolveAlertScope } from '@/lib/alerts/resolve-alert-scope'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const scope = await resolveAlertScope(supabase, user.id)
    if (!scope) {
      return NextResponse.json({ error: 'Sin permisos para ver alertas' }, { status: 403 })
    }

    if (scope.clientIds && scope.clientIds.length === 0) {
      return NextResponse.json({
        warningCount: 0,
        expiredCount: 0,
        items: [],
      })
    }

    const admin = createAdminClient()
    const summary = await buildExpirationAlerts(admin, { clientIds: scope.clientIds })

    return NextResponse.json(summary)
  } catch (error) {
    console.error('[alerts/expirations]', error)
    return NextResponse.json({ error: 'Error al consultar alertas' }, { status: 500 })
  }
}
