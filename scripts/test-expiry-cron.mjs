/**
 * Prueba manual del cron de digests (local).
 * Uso: node scripts/test-expiry-cron.mjs
 */
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

const base = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'
const secret = process.env.CRON_SECRET
const headers = secret ? { Authorization: `Bearer ${secret}` } : {}

const res = await fetch(`${base}/api/cron/expiry-notifications`, { headers })
const body = await res.json().catch(() => ({}))
console.log(res.status, JSON.stringify(body, null, 2))
