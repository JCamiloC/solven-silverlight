/**
 * Verifica estado 2FA de usuarios de un cliente por nombre (requiere SERVICE_ROLE).
 * Uso: node scripts/check-client-mfa.mjs metricom
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

const search = (process.argv[2] || '').trim()
if (!search) {
  console.error('Uso: node scripts/check-client-mfa.mjs <nombre-cliente>')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: clients, error: clientError } = await admin
  .from('clients')
  .select('id, name, nit')
  .ilike('name', `%${search}%`)

if (clientError) {
  console.error('Error clients:', clientError.message)
  process.exit(1)
}

if (!clients?.length) {
  console.log(`Sin clientes que coincidan con "${search}"`)
  process.exit(0)
}

for (const client of clients) {
  console.log(`\nCliente: ${client.name} (${client.id})`)

  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select(
      'email, role, totp_enabled, last_totp_verification, totp_secret, user_id, first_name, last_name'
    )
    .eq('client_id', client.id)

  if (profileError) {
    console.error('  Error profiles:', profileError.message)
    continue
  }

  if (!profiles?.length) {
    console.log('  (sin usuarios vinculados)')
    continue
  }

  for (const p of profiles) {
    const hasSecret = Boolean(p.totp_secret)
    const okForAccesos = p.totp_enabled === true && hasSecret
    console.log(`  - ${p.email} (${p.role})`)
    console.log(`      totp_enabled: ${p.totp_enabled}`)
    console.log(`      totp_secret:  ${hasSecret ? 'presente' : 'ausente'}`)
    console.log(`      last_totp_verification: ${p.last_totp_verification || 'nunca'}`)
    console.log(`      accesos (post-fix): ${okForAccesos ? 'OK si verifica código al entrar' : 'BLOQUEADO hasta configurar 2FA'}`)
  }
}
