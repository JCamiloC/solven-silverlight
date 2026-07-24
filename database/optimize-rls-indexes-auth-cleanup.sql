-- Performance + security hardening
-- 1) Helper functions (auth.uid cached once per statement)
-- 2) Indexes on hot FKs
-- 3) Fix broken RLS policies (profiles.id vs auth.uid mismatch)
-- 4) Enable RLS on exposed tables
-- 5) Cleanup stale auth sessions/tokens

-- =====================================================
-- 1. HELPERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.current_auth_uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM public.profiles
  WHERE user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('administrador', 'lider_soporte', 'agente_soporte')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_leader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = (SELECT auth.uid())
      AND role IN ('administrador', 'lider_soporte')
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_auth_uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_leader() TO authenticated;

-- =====================================================
-- 2. INDEXES (hot paths)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON public.tickets (client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets (created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_by ON public.ticket_comments (created_by);

CREATE INDEX IF NOT EXISTS idx_hardware_assets_client_id ON public.hardware_assets (client_id);
CREATE INDEX IF NOT EXISTS idx_hardware_seguimientos_hardware_id ON public.hardware_seguimientos (hardware_id);
CREATE INDEX IF NOT EXISTS idx_hardware_seguimientos_creado_por ON public.hardware_seguimientos (creado_por);
CREATE INDEX IF NOT EXISTS idx_hardware_actas_hardware_asset_id ON public.hardware_actas (hardware_asset_id);
CREATE INDEX IF NOT EXISTS idx_hardware_upgrades_hardware_id ON public.hardware_upgrades (hardware_id);

CREATE INDEX IF NOT EXISTS idx_access_credentials_client_id ON public.access_credentials (client_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_credential_id ON public.access_logs (credential_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_by ON public.access_logs (accessed_by);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON public.access_logs (accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_visitas_client_id ON public.client_visitas (client_id);
CREATE INDEX IF NOT EXISTS idx_client_visita_equipos_visita_id ON public.client_visita_equipos (visita_id);
CREATE INDEX IF NOT EXISTS idx_client_maintenance_schedule_client_id ON public.client_maintenance_schedule (client_id);

CREATE INDEX IF NOT EXISTS idx_software_licenses_client_id ON public.software_licenses (client_id);
CREATE INDEX IF NOT EXISTS idx_custom_applications_client_id ON public.custom_applications (client_id);
CREATE INDEX IF NOT EXISTS idx_custom_app_followups_application_id ON public.custom_app_followups (application_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles (client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- =====================================================
-- 3. CLEAN STALE AUTH SESSIONS / TOKENS
-- =====================================================
DELETE FROM auth.refresh_tokens
WHERE revoked = true
   OR updated_at < now() - interval '30 days';

DELETE FROM auth.sessions
WHERE (not_after IS NOT NULL AND not_after < now())
   OR created_at < now() - interval '30 days';

-- =====================================================
-- 4. TICKETS RLS (rewrite + enable)
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Leaders can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Agents can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Clients can view their tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Leaders can update all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Agents can update assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_select_staff"
ON public.tickets FOR SELECT TO authenticated
USING (public.is_staff());

CREATE POLICY "tickets_select_client"
ON public.tickets FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'cliente'
  AND client_id = public.current_client_id()
);

CREATE POLICY "tickets_insert_authenticated"
ON public.tickets FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid())
  )
);

-- Staff puede actualizar cualquier ticket (comportamiento real de la app con RLS off)
CREATE POLICY "tickets_update_staff"
ON public.tickets FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "tickets_delete_admin"
ON public.tickets FOR DELETE TO authenticated
USING (public.current_user_role() = 'administrador');

-- =====================================================
-- 5. TICKET COMMENTS RLS
-- =====================================================
DROP POLICY IF EXISTS "Admins can delete comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Admins can update comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Admins can view all comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Agents can view all comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Clients can view public comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Leaders can view all comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.ticket_comments;

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_comments_select_staff"
ON public.ticket_comments FOR SELECT TO authenticated
USING (public.is_staff());

CREATE POLICY "ticket_comments_select_client"
ON public.ticket_comments FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'cliente'
  AND is_internal = false
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_comments.ticket_id
      AND t.client_id = public.current_client_id()
  )
);

CREATE POLICY "ticket_comments_insert"
ON public.ticket_comments FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  OR created_by = public.current_profile_id()
);

CREATE POLICY "ticket_comments_update_own"
ON public.ticket_comments FOR UPDATE TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR created_by = public.current_profile_id()
  OR public.current_user_role() = 'administrador'
)
WITH CHECK (
  created_by = (SELECT auth.uid())
  OR created_by = public.current_profile_id()
  OR public.current_user_role() = 'administrador'
);

CREATE POLICY "ticket_comments_delete_admin"
ON public.ticket_comments FOR DELETE TO authenticated
USING (public.current_user_role() = 'administrador');

-- =====================================================
-- 6. HARDWARE ASSETS RLS
-- =====================================================
DROP POLICY IF EXISTS "Allow admin and support delete" ON public.hardware_assets;
DROP POLICY IF EXISTS "Allow admin and support insert" ON public.hardware_assets;
DROP POLICY IF EXISTS "Allow admin and support select" ON public.hardware_assets;
DROP POLICY IF EXISTS "Allow admin and support update" ON public.hardware_assets;
DROP POLICY IF EXISTS "Solo admin y lider_soporte pueden actualizar hardware" ON public.hardware_assets;
DROP POLICY IF EXISTS "Solo admin y lider_soporte pueden eliminar hardware" ON public.hardware_assets;

ALTER TABLE public.hardware_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hardware_assets_select"
ON public.hardware_assets FOR SELECT TO authenticated
USING (
  public.is_staff()
  OR (
    public.current_user_role() = 'cliente'
    AND client_id = public.current_client_id()
  )
);

CREATE POLICY "hardware_assets_insert_staff"
ON public.hardware_assets FOR INSERT TO authenticated
WITH CHECK (public.is_staff());

CREATE POLICY "hardware_assets_update_staff"
ON public.hardware_assets FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "hardware_assets_delete_admin_leader"
ON public.hardware_assets FOR DELETE TO authenticated
USING (public.is_admin_or_leader());

-- =====================================================
-- 7. RELATED TABLES WITHOUT RLS
-- =====================================================
ALTER TABLE public.hardware_seguimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hardware_seguimientos_all_staff" ON public.hardware_seguimientos;
DROP POLICY IF EXISTS "hardware_seguimientos_select_client" ON public.hardware_seguimientos;
CREATE POLICY "hardware_seguimientos_all_staff"
ON public.hardware_seguimientos FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());
CREATE POLICY "hardware_seguimientos_select_client"
ON public.hardware_seguimientos FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'cliente'
  AND EXISTS (
    SELECT 1 FROM public.hardware_assets h
    WHERE h.id = hardware_seguimientos.hardware_id
      AND h.client_id = public.current_client_id()
  )
);

ALTER TABLE public.hardware_actas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hardware_actas_staff" ON public.hardware_actas;
CREATE POLICY "hardware_actas_staff"
ON public.hardware_actas FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

ALTER TABLE public.software_licenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "software_licenses_staff" ON public.software_licenses;
DROP POLICY IF EXISTS "software_licenses_select_client" ON public.software_licenses;
CREATE POLICY "software_licenses_staff"
ON public.software_licenses FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());
CREATE POLICY "software_licenses_select_client"
ON public.software_licenses FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'cliente'
  AND client_id = public.current_client_id()
);

ALTER TABLE public.custom_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_applications_staff" ON public.custom_applications;
DROP POLICY IF EXISTS "custom_applications_select_client" ON public.custom_applications;
CREATE POLICY "custom_applications_staff"
ON public.custom_applications FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());
CREATE POLICY "custom_applications_select_client"
ON public.custom_applications FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'cliente'
  AND client_id = public.current_client_id()
);

ALTER TABLE public.custom_app_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_app_followups_staff" ON public.custom_app_followups;
CREATE POLICY "custom_app_followups_staff"
ON public.custom_app_followups FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

ALTER TABLE public.client_maintenance_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_maintenance_staff" ON public.client_maintenance_schedule;
DROP POLICY IF EXISTS "client_maintenance_select_client" ON public.client_maintenance_schedule;
CREATE POLICY "client_maintenance_staff"
ON public.client_maintenance_schedule FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());
CREATE POLICY "client_maintenance_select_client"
ON public.client_maintenance_schedule FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'cliente'
  AND client_id = public.current_client_id()
);

ALTER TABLE public.client_visitas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_visitas_staff" ON public.client_visitas;
DROP POLICY IF EXISTS "client_visitas_select_client" ON public.client_visitas;
CREATE POLICY "client_visitas_staff"
ON public.client_visitas FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());
CREATE POLICY "client_visitas_select_client"
ON public.client_visitas FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'cliente'
  AND client_id = public.current_client_id()
);

ALTER TABLE public.client_visita_equipos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_visita_equipos_staff" ON public.client_visita_equipos;
DROP POLICY IF EXISTS "client_visita_equipos_select_client" ON public.client_visita_equipos;
CREATE POLICY "client_visita_equipos_staff"
ON public.client_visita_equipos FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());
CREATE POLICY "client_visita_equipos_select_client"
ON public.client_visita_equipos FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'cliente'
  AND EXISTS (
    SELECT 1 FROM public.client_visitas v
    WHERE v.id = client_visita_equipos.visita_id
      AND v.client_id = public.current_client_id()
  )
);

ALTER TABLE public.parametros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parametros_select_authenticated" ON public.parametros;
DROP POLICY IF EXISTS "parametros_write_admin_leader" ON public.parametros;
CREATE POLICY "parametros_select_authenticated"
ON public.parametros FOR SELECT TO authenticated
USING (true);
CREATE POLICY "parametros_write_admin_leader"
ON public.parametros FOR ALL TO authenticated
USING (public.is_admin_or_leader())
WITH CHECK (public.is_admin_or_leader());

-- =====================================================
-- 8. OPTIMIZE EXISTING POLICIES (auth.uid once)
-- =====================================================
DROP POLICY IF EXISTS "Admins can delete credentials" ON public.access_credentials;
DROP POLICY IF EXISTS "Admins can insert credentials" ON public.access_credentials;
DROP POLICY IF EXISTS "Admins can update credentials" ON public.access_credentials;
DROP POLICY IF EXISTS "Admins can view all credentials" ON public.access_credentials;
DROP POLICY IF EXISTS "Leaders can insert credentials" ON public.access_credentials;
DROP POLICY IF EXISTS "Leaders can update credentials" ON public.access_credentials;
DROP POLICY IF EXISTS "Leaders can view all credentials" ON public.access_credentials;

CREATE POLICY "access_credentials_select"
ON public.access_credentials FOR SELECT TO authenticated
USING (
  public.is_admin_or_leader()
  OR (
    public.current_user_role() = 'cliente'
    AND client_id = public.current_client_id()
  )
);
CREATE POLICY "access_credentials_insert"
ON public.access_credentials FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_leader());
CREATE POLICY "access_credentials_update"
ON public.access_credentials FOR UPDATE TO authenticated
USING (public.is_admin_or_leader())
WITH CHECK (public.is_admin_or_leader());
CREATE POLICY "access_credentials_delete"
ON public.access_credentials FOR DELETE TO authenticated
USING (public.current_user_role() = 'administrador');

DROP POLICY IF EXISTS "Admins can view all access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Leaders can view all access logs" ON public.access_logs;
DROP POLICY IF EXISTS "Authenticated users can insert access logs" ON public.access_logs;

CREATE POLICY "access_logs_select_admin_leader"
ON public.access_logs FOR SELECT TO authenticated
USING (public.is_admin_or_leader());
CREATE POLICY "access_logs_insert_authenticated"
ON public.access_logs FOR INSERT TO authenticated
WITH CHECK (public.current_profile_id() IS NOT NULL);

DROP POLICY IF EXISTS "Allow admin and leader to insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow admin and leader to update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow admin to delete clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all read" ON public.clients;

CREATE POLICY "clients_select"
ON public.clients FOR SELECT TO authenticated
USING (
  public.is_staff()
  OR (
    public.current_user_role() = 'cliente'
    AND id = public.current_client_id()
  )
);
CREATE POLICY "clients_insert"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_leader());
CREATE POLICY "clients_update"
ON public.clients FOR UPDATE TO authenticated
USING (public.is_admin_or_leader())
WITH CHECK (public.is_admin_or_leader());
CREATE POLICY "clients_delete"
ON public.clients FOR DELETE TO authenticated
USING (public.current_user_role() = 'administrador');

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.profiles;
DROP POLICY IF EXISTS "Allow own update" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "profiles_select"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.is_staff()
  OR user_id = (SELECT auth.uid())
);
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "profiles_update"
ON public.profiles FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.current_user_role() = 'administrador'
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR public.current_user_role() = 'administrador'
);

DROP POLICY IF EXISTS "chat_messages_insert" ON public.support_chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON public.support_chat_messages;
DROP POLICY IF EXISTS "chat_sessions_insert" ON public.support_chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_select" ON public.support_chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_update" ON public.support_chat_sessions;

CREATE POLICY "chat_sessions_select"
ON public.support_chat_sessions FOR SELECT TO authenticated
USING (
  client_user_id = (SELECT auth.uid())
  OR public.is_staff()
);
CREATE POLICY "chat_sessions_insert"
ON public.support_chat_sessions FOR INSERT TO authenticated
WITH CHECK (client_user_id = (SELECT auth.uid()));
CREATE POLICY "chat_sessions_update"
ON public.support_chat_sessions FOR UPDATE TO authenticated
USING (
  client_user_id = (SELECT auth.uid())
  OR public.is_staff()
)
WITH CHECK (
  client_user_id = (SELECT auth.uid())
  OR public.is_staff()
);

CREATE POLICY "chat_messages_select"
ON public.support_chat_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_chat_sessions s
    WHERE s.id = support_chat_messages.session_id
      AND (s.client_user_id = (SELECT auth.uid()) OR public.is_staff())
  )
);
CREATE POLICY "chat_messages_insert"
ON public.support_chat_messages FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_chat_sessions s
    WHERE s.id = support_chat_messages.session_id
      AND (s.client_user_id = (SELECT auth.uid()) OR public.is_staff())
  )
);
