/**
 * Prueba repetida de login vía API Supabase (sin UI).
 * Uso: node scripts/test-login-repeat.mjs [email] [password] [intentos]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

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

const arg = (index, fallback = '') => {
  const value = process.argv[index]
  return value && value.trim() ? value.trim() : fallback
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const email = arg(2, process.env.LOGIN_TEST_EMAIL || 'desarrollo@silverlight.com.co')
const password = arg(3, process.env.LOGIN_TEST_PASSWORD || '')
const attempts = Number(arg(4, '5'))

if (!url || !anonKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local')
  process.exit(1)
}

if (!password) {
  console.error('Indica contraseña: LOGIN_TEST_PASSWORD=... node scripts/test-login-repeat.mjs')
  console.error('O: node scripts/test-login-repeat.mjs email password 5')
  process.exit(1)
}

const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function oneAttempt(index) {
  const started = Date.now()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  const ms = Date.now() - started

  if (error) {
    return { index, ok: false, ms, message: error.message }
  }

  const userId = data.session?.user?.id
  await supabase.auth.signOut({ scope: 'local' })
  return { index, ok: true, ms, userId }
}

async function main() {
  console.log(`Login repeat test: ${attempts} intentos → ${email}`)
  const results = []

  for (let i = 1; i <= attempts; i++) {
    const result = await oneAttempt(i)
    results.push(result)
    const status = result.ok ? 'OK' : 'FAIL'
    console.log(`  #${i} ${status} ${result.ms}ms${result.message ? ` — ${result.message}` : ''}`)
    if (!result.ok) break
    await new Promise((r) => setTimeout(r, 300))
  }

  const failed = results.filter((r) => !r.ok)
  const times = results.filter((r) => r.ok).map((r) => r.ms)
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0

  console.log('')
  if (failed.length) {
    console.error(`FALLÓ en intento ${failed[0].index}: ${failed[0].message}`)
    process.exit(1)
  }

  console.log(`Todos OK (${results.length}/${attempts}). Promedio: ${avg}ms`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
