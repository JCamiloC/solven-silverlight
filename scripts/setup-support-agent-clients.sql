-- Ejecutar en Supabase SQL Editor si no usas el script .mjs

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
