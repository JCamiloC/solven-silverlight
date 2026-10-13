/**
 * Indica cómo crear alert_digest_log (DDL en Supabase SQL Editor).
 * Uso: node scripts/setup-alert-digest-log.mjs
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'fs'

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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (url && serviceKey) {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await admin.from('alert_digest_log').select('id').limit(1)
  if (!error) {
    console.log('OK: la tabla alert_digest_log ya existe.')
    process.exit(0)
  }
  if (error.code !== '42P01' && error.code !== 'PGRST205') {
    console.error('Error comprobando tabla:', error.message)
    process.exit(1)
  }
}

console.log('Ejecuta en Supabase SQL Editor:')
console.log(resolve(process.cwd(), 'database/create-alert-digest-log.sql'))
