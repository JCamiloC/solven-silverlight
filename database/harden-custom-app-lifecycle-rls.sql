-- =====================================================
-- Endurecer RLS para lifecycle de custom apps
-- Reemplaza policies permissivas authenticated_all
-- =====================================================

-- Helper: valida acceso del usuario autenticado a una aplicacion
create or replace function public.can_access_custom_application(app_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.custom_applications ca on ca.id = app_id
    where p.user_id = auth.uid()
      and (
        p.role in ('administrador', 'lider_soporte', 'agente_soporte')
        or (p.role = 'cliente' and p.client_id = ca.client_id)
      )
  );
$$;

revoke all on function public.can_access_custom_application(uuid) from public;
grant execute on function public.can_access_custom_application(uuid) to authenticated;

-- software_project_phases
DROP POLICY IF EXISTS software_project_phases_authenticated_all ON public.software_project_phases;
CREATE POLICY software_project_phases_access
  ON public.software_project_phases
  FOR ALL
  TO authenticated
  USING (public.can_access_custom_application(application_id))
  WITH CHECK (public.can_access_custom_application(application_id));

-- software_documents
DROP POLICY IF EXISTS software_documents_authenticated_all ON public.software_documents;
CREATE POLICY software_documents_access
  ON public.software_documents
  FOR ALL
  TO authenticated
  USING (public.can_access_custom_application(application_id))
  WITH CHECK (public.can_access_custom_application(application_id));

-- software_meetings
DROP POLICY IF EXISTS software_meetings_authenticated_all ON public.software_meetings;
CREATE POLICY software_meetings_access
  ON public.software_meetings
  FOR ALL
  TO authenticated
  USING (public.can_access_custom_application(application_id))
  WITH CHECK (public.can_access_custom_application(application_id));

-- software_meeting_items
DROP POLICY IF EXISTS software_meeting_items_authenticated_all ON public.software_meeting_items;
CREATE POLICY software_meeting_items_access
  ON public.software_meeting_items
  FOR ALL
  TO authenticated
  USING (public.can_access_custom_application(application_id))
  WITH CHECK (public.can_access_custom_application(application_id));

-- software_releases
DROP POLICY IF EXISTS software_releases_authenticated_all ON public.software_releases;
CREATE POLICY software_releases_access
  ON public.software_releases
  FOR ALL
  TO authenticated
  USING (public.can_access_custom_application(application_id))
  WITH CHECK (public.can_access_custom_application(application_id));

-- software_postsale_adjustments
DROP POLICY IF EXISTS software_postsale_adjustments_authenticated_all ON public.software_postsale_adjustments;
CREATE POLICY software_postsale_adjustments_access
  ON public.software_postsale_adjustments
  FOR ALL
  TO authenticated
  USING (public.can_access_custom_application(application_id))
  WITH CHECK (public.can_access_custom_application(application_id));
