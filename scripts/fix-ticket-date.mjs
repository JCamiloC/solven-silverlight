/**
 * Corrige fecha de un ticket por número (SERVICE_ROLE).
 * Uso: node scripts/fix-ticket-date.mjs Silver20260511-031 2025-11-11 [--apply]
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

const ticketNumber = process.argv[2]
const newDate = process.argv[3] // YYYY-MM-DD
const apply = process.argv.includes('--apply')

if (!ticketNumber || !newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
  console.error('Uso: node scripts/fix-ticket-date.mjs <ticket_number> <YYYY-MM-DD> [--apply]')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Faltan variables en .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function shiftYear(iso, targetYear) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCFullYear(Number(targetYear))
  return d.toISOString()
}

const targetYear = newDate.slice(0, 4)

const { data: row, error } = await admin
  .from('tickets')
  .select('id, ticket_number, title, created_at, updated_at, resolved_at')
  .eq('ticket_number', ticketNumber)
  .maybeSingle()

if (error) {
  console.error(error.message)
  process.exit(1)
}
if (!row) {
  console.error('Ticket no encontrado:', ticketNumber)
  process.exit(1)
}

const createdIso = `${newDate}T00:00:00.000Z`
const updates = {
  created_at: createdIso,
  updated_at: row.updated_at?.startsWith('2026')
    ? shiftYear(row.updated_at, targetYear)
    : row.updated_at,
  resolved_at: row.resolved_at?.startsWith('2026')
    ? shiftYear(row.resolved_at, targetYear)
    : row.resolved_at,
}

console.log('Antes:', row)
console.log('Propuesta:', updates)

if (!apply) {
  console.log('\nDry-run. Agrega --apply para guardar.')
  process.exit(0)
}

const { data: updated, error: upErr } = await admin
  .from('tickets')
  .update(updates)
  .eq('id', row.id)
  .select('id, ticket_number, created_at, resolved_at, updated_at')
  .single()

if (upErr) {
  console.error('Error al actualizar:', upErr.message)
  process.exit(1)
}

console.log('Actualizado:', updated)
