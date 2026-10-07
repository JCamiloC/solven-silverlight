/**
 * Audita RLS comparando service role (bypass) vs usuario autenticado.
 * Uso: node scripts/check-rls-status.mjs
 * Requiere .env.local: URL, ANON, SERVICE_ROLE, LOGIN_TEST_EMAIL, LOGIN_TEST_PASSWORD
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.LOGIN_TEST_EMAIL
const password = process.env.LOGIN_TEST_PASSWORD

if (!url || !anon || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL, ANON o SERVICE_ROLE en .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TABLES = [
  'clients',
  'profiles',
  'tickets',
  'ticket_comments',
  'hardware_assets',
  'hardware_seguimientos',
  'hardware_actas',
  'hardware_upgrades',
  'software_licenses',
  'custom_applications',
  'custom_app_followups',
  'client_visitas',
  'client_visita_equipos',
  'client_maintenance_schedule',
  'parametros',
  'access_credentials',
  'access_logs',
  'support_chat_sessions',
  'support_chat_messages',
  'software_project_phases',
  'software_documents',
  'software_meetings',
  'software_meeting_items',
  'software_releases',
  'software_postsale_adjustments',
  'pending_users',
  'user_invitations',
  'actas',
]

async function headCount(client, table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true })
  if (error) {
    return { ok: false, code: error.code, message: error.message }
  }
  return { ok: true, count: count ?? 0 }
}

let userClient = null
if (email && password) {
  userClient = createClient(url, anon)
  const { error: signErr } = await userClient.auth.signInWithPassword({ email, password })
  if (signErr) {
    console.warn('Login test falló:', signErr.message, '(solo se usa service role)\n')
    userClient = null
  } else {
    const { data: profile } = await userClient.from('profiles').select('role, email').single()
    console.log('Usuario prueba:', profile?.email, '| rol:', profile?.role, '\n')
  }
}

console.log('tabla | admin_count | user_select | nota')
console.log('--- | --- | --- | ---')

for (const table of TABLES) {
  const adminRes = await headCount(admin, table)
  if (!adminRes.ok) {
    console.log(`${table} | — | — | tabla inexistente o sin acceso (${adminRes.code})`)
    continue
  }

  let userCell = '—'
  let note = ''

  if (userClient) {
    const userRes = await headCount(userClient, table)
    if (!userRes.ok) {
      userCell = `ERR ${userRes.code}`
      note = userRes.message.includes('permission') || userRes.code === '42501' ? 'RLS/permiso' : 'error'
    } else {
      userCell = String(userRes.count)
      if (userRes.count === adminRes.count) {
        note = adminRes.count > 0 ? 'mismo conteo que admin (RLS off o policy amplia)' : 'vacía'
      } else if (userRes.count === 0 && adminRes.count > 0) {
        note = 'RLS filtra o sin filas visibles para este rol'
      } else {
        note = 'conteo distinto (RLS activo)'
      }
    }
  }

  console.log(`${table} | ${adminRes.count} | ${userCell} | ${note}`)
}

console.log('\nNota: esto NO reemplaza pg_policies. Para RLS exacto ejecuta el SQL del README en SQL Editor.')
