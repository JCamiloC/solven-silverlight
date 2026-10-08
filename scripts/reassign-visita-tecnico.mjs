/**
 * Busca visitas de un cliente hoy y reasigna técnico (dry-run por defecto).
 * Uso: node scripts/reassign-visita-tecnico.mjs --client cyd --from julian --to "camilo rojas" [--apply]
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

const args = process.argv.slice(2)
const getArg = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : ''
}
const clientSearch = getArg('--client') || ''
const fromSearch = (getArg('--from') || 'julian').toLowerCase()
const toSearch = (getArg('--to') || 'camilo rojas').toLowerCase()
const apply = args.includes('--apply')
const allClients = args.includes('--all-clients')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function nameMatch(profile, term) {
  if (!profile) return false
  const full = `${profile.first_name || ''} ${profile.last_name || ''}`.toLowerCase()
  return (
    full.includes(term) ||
    (profile.first_name || '').toLowerCase().includes(term) ||
    (profile.last_name || '').toLowerCase().includes(term) ||
    (profile.email || '').toLowerCase().includes(term)
  )
}

const now = new Date()
const bogotaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(now)
const start = new Date(`${bogotaDay}T00:00:00-05:00`)
const end = new Date(`${bogotaDay}T23:59:59.999-05:00`)

let clients = []
if (allClients || !clientSearch) {
  const { data, error } = await admin.from('clients').select('id, name')
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  clients = data || []
} else {
  const { data: found, error: ce } = await admin
    .from('clients')
    .select('id, name')
    .ilike('name', `%${clientSearch}%`)

  if (ce) {
    console.error(ce.message)
    process.exit(1)
  }
  clients = found || []
}

if (!clients.length) {
  console.log(
    clientSearch
      ? `No hay clientes que coincidan con "${clientSearch}". Prueba otro nombre o --all-clients`
      : 'No hay clientes en la base de datos'
  )
  process.exit(0)
}

const { data: profiles, error: pe } = await admin
  .from('profiles')
  .select('id, user_id, first_name, last_name, email, role')

if (pe) {
  console.error(pe.message)
  process.exit(1)
}

const toProfile = profiles.find((p) => nameMatch(p, toSearch))
if (!toProfile) {
  console.error(`No se encontró perfil destino para "${toSearch}"`)
  process.exit(1)
}

const matches = []

for (const client of clients) {
  const { data: visits, error: ve } = await admin
    .from('client_visitas')
    .select('id, fecha_visita, estado, tecnico_responsable, creado_por, detalle')
    .eq('client_id', client.id)
    .gte('fecha_visita', start.toISOString())
    .lte('fecha_visita', end.toISOString())

  if (ve) {
    console.error('Error visitas:', ve.message)
    continue
  }

  for (const v of visits || []) {
    const tech = profiles.find((p) => p.id === v.tecnico_responsable)
    if (!nameMatch(tech, fromSearch)) continue
    matches.push({ client, visit: v, tech })
  }
}

console.log(`Día (America/Bogota): ${bogotaDay}`)
console.log(`Destino: ${toProfile.first_name} ${toProfile.last_name} (${toProfile.id})`)
console.log(`Coincidencias con "${fromSearch}": ${matches.length}`)

for (const m of matches) {
  const techName = m.tech
    ? `${m.tech.first_name} ${m.tech.last_name}`.trim()
    : m.visit.tecnico_responsable
  console.log(
    `- [${m.client.name}] visita ${m.visit.id} | ${m.visit.fecha_visita} | técnico: ${techName} | estado: ${m.visit.estado} | detalle: ${(m.visit.detalle || '').slice(0, 60)}`
  )
}

if (!matches.length) {
  process.exit(0)
}

if (!apply) {
  console.log('\nDry-run. Para aplicar: agrega --apply al comando')
  process.exit(0)
}

for (const m of matches) {
  const { error } = await admin
    .from('client_visitas')
    .update({ tecnico_responsable: toProfile.id })
    .eq('id', m.visit.id)

  if (error) {
    console.error(`Error actualizando ${m.visit.id}:`, error.message)
  } else {
    console.log(`Actualizada visita ${m.visit.id} → ${toProfile.first_name} ${toProfile.last_name}`)
  }
}
