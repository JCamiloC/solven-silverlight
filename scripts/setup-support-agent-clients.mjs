/**
 * Crea tabla support_agent_clients (agente ↔ empresas) y políticas RLS básicas.
 * Uso: node scripts/setup-support-agent-clients.mjs
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

const sql = `
create table if not exists public.support_agent_clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, client_id)
);

create index if not exists support_agent_clients_profile_id_idx
  on public.support_agent_clients (profile_id);

create index if not exists support_agent_clients_client_id_idx
  on public.support_agent_clients (client_id);

alter table public.support_agent_clients enable row level security;

drop policy if exists "support_agent_clients_select_own" on public.support_agent_clients;
create policy "support_agent_clients_select_own"
  on public.support_agent_clients for select
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('administrador', 'lider_soporte')
    )
  );

drop policy if exists "support_agent_clients_manage_staff" on public.support_agent_clients;
create policy "support_agent_clients_manage_staff"
  on public.support_agent_clients for all
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('administrador', 'lider_soporte')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('administrador', 'lider_soporte')
    )
  );
`

console.log('Ejecuta el SQL en Supabase → SQL Editor (archivo setup-support-agent-clients.sql):\n')
console.log('  scripts/setup-support-agent-clients.sql')
console.log('\nO copia desde el repo y pégalo en el panel de Supabase.')
