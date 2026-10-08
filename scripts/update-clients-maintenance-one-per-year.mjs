/**
 * Actualiza mantenimientos_al_anio = 1 y ajusta client_maintenance_schedule.
 * Uso: node scripts/update-clients-maintenance-one-per-year.mjs
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/** Clientes acordados → 1 mantenimiento al año */
const CLIENT_IDS = [
  '3b4eb81a-2020-4f1a-8f59-093995730a70', // Ingegas
  '7033184c-9e5d-4e50-b8cf-b91c026e045f', // Medellín y Duran
  '2ca052e8-2d04-4ab9-8f23-1bc9365c6ada', // Ingeniería, construcciones y diseños C&D
  '0745962e-0dc2-4957-b4e2-f882842b0628', // Corporación Punto Azul
  '79b0998f-d881-4d5a-bb52-dab5c7e440a0', // US Biosolutions
  '8f2759b8-f41f-4126-aaa1-9973415e1652', // Vigilancia y Seguridad Cronos
  '86d0d5af-9e37-448c-a05a-f63c47b4b9e4', // Dimetales
  'f5a39d43-8f4d-49dd-8f1d-f51beed2c1c4', // Compañía Colombiana de Lavado
  'cd0aed4a-6abf-4582-81ae-0ba8f96c4c66', // Grupo AGO
  'b89f6a81-2eb6-4f0b-8545-2388383975dc', // Transsabana
  '608de375-b001-462d-ac17-4eed51ae2b54', // Metricom
  '557dab4f-6680-4c9e-8a6a-4db4e532e7a7', // Rockit Cargo
  '40518078-8d73-434d-a702-15293178a414', // Silverlight Colombia
  '65feee21-43ba-4772-9164-81e29733591f', // Bahiaclass
  '667a4a5d-531b-4e26-9b8d-dd91d195af0e', // Transportes Fontibon
]

const TOTAL_PER_YEAR = 1
const SCHEDULE_YEARS = [2025, 2026]

function calculateExpectedDate(year, slotNumber, totalMaintenances) {
  const monthIndex = Math.max(
    0,
    Math.min(11, Math.round(((slotNumber - 0.5) * 12) / totalMaintenances) - 1)
  )
  const date = new Date(Date.UTC(year, monthIndex, 15))
  return date.toISOString().split('T')[0]
}

async function ensureYearSchedule(clientId, year, totalMaintenances) {
  const { data: existing, error: listError } = await admin
    .from('client_maintenance_schedule')
    .select('*')
    .eq('client_id', clientId)
    .eq('year', year)
    .order('slot_number', { ascending: true })

  if (listError) throw listError

  const rows = existing || []
  const existingSlots = new Set(rows.map((row) => row.slot_number))
  const rowsToDelete = []
  const rowsToReschedule = []
  const missingRows = []

  for (const row of rows) {
    if (row.slot_number > totalMaintenances) {
      if (row.status !== 'realizado') {
        rowsToDelete.push(row.id)
      }
      continue
    }
    if (row.status !== 'realizado') {
      const nextExpectedDate = calculateExpectedDate(year, row.slot_number, totalMaintenances)
      if (row.expected_date !== nextExpectedDate) {
        rowsToReschedule.push({ id: row.id, expected_date: nextExpectedDate })
      }
    }
  }

  for (let slot = 1; slot <= totalMaintenances; slot++) {
    if (!existingSlots.has(slot)) {
      missingRows.push({
        client_id: clientId,
        year,
        slot_number: slot,
        expected_date: calculateExpectedDate(year, slot, totalMaintenances),
        status: 'pendiente',
      })
    }
  }

  if (rowsToDelete.length) {
    const { error } = await admin.from('client_maintenance_schedule').delete().in('id', rowsToDelete)
    if (error) throw error
  }

  for (const row of rowsToReschedule) {
    const { error } = await admin
      .from('client_maintenance_schedule')
      .update({ expected_date: row.expected_date })
      .eq('id', row.id)
    if (error) throw error
  }

  if (missingRows.length) {
    const { error } = await admin
      .from('client_maintenance_schedule')
      .upsert(missingRows, { onConflict: 'client_id,year,slot_number', ignoreDuplicates: true })
    if (error) throw error
  }

  return {
    deleted: rowsToDelete.length,
    rescheduled: rowsToReschedule.length,
    inserted: missingRows.length,
  }
}

const { data: before, error: beforeError } = await admin
  .from('clients')
  .select('id, name, mantenimientos_al_anio')
  .in('id', CLIENT_IDS)
  .order('name')

if (beforeError) {
  console.error(beforeError)
  process.exit(1)
}

console.log('Antes:')
for (const row of before || []) {
  console.log(`  - ${row.name}: ${row.mantenimientos_al_anio}`)
}

const { error: updateError } = await admin
  .from('clients')
  .update({ mantenimientos_al_anio: TOTAL_PER_YEAR, updated_at: new Date().toISOString() })
  .in('id', CLIENT_IDS)

if (updateError) {
  console.error('Error actualizando clients:', updateError)
  process.exit(1)
}

console.log('\nSincronizando agenda...')
for (const clientId of CLIENT_IDS) {
  const name = before?.find((c) => c.id === clientId)?.name ?? clientId
  for (const year of SCHEDULE_YEARS) {
    const stats = await ensureYearSchedule(clientId, year, TOTAL_PER_YEAR)
    if (stats.deleted || stats.rescheduled || stats.inserted) {
      console.log(
        `  ${name} (${year}): +${stats.inserted} fechas, ~${stats.rescheduled} recalc., -${stats.deleted} slots extra`
      )
    }
  }
}

const { data: after } = await admin
  .from('clients')
  .select('id, name, mantenimientos_al_anio')
  .in('id', CLIENT_IDS)
  .order('name')

console.log('\nDespués (todos deben ser 1):')
for (const row of after || []) {
  console.log(`  - ${row.name}: ${row.mantenimientos_al_anio}`)
}

console.log('\nListo.')
