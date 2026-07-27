-- Notificaciones de actualización de tickets (leído / no leído)
-- Versión corregida: last_update_by = profiles.id; RPC usable por cliente vía SECURITY DEFINER

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS has_update boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_update_by uuid,
  ADD COLUMN IF NOT EXISTS last_update_type varchar(50);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_last_update_by_fkey'
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_last_update_by_fkey
      FOREIGN KEY (last_update_by) REFERENCES public.profiles(id);
  END IF;
END $$;

COMMENT ON COLUMN public.tickets.has_update IS 'Indica si hay una actualización pendiente de notificar/leer';
COMMENT ON COLUMN public.tickets.last_update_by IS 'Perfil que realizó la última actualización notificada';
COMMENT ON COLUMN public.tickets.last_update_type IS 'Tipo: comment, status_change, assignment';

ALTER TABLE public.ticket_comments
  ADD COLUMN IF NOT EXISTS commenter_name text,
  ADD COLUMN IF NOT EXISTS commenter_role varchar(50);

CREATE OR REPLACE FUNCTION public.resolve_profile_id(actor uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT id FROM public.profiles WHERE id = actor LIMIT 1),
    (SELECT id FROM public.profiles WHERE user_id = actor LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.update_ticket_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tickets
  SET
    has_update = true,
    last_update_by = public.resolve_profile_id(NEW.created_by),
    last_update_type = 'comment',
    updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticket_comment_notification ON public.ticket_comments;
CREATE TRIGGER ticket_comment_notification
  AFTER INSERT ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_notification();

CREATE OR REPLACE FUNCTION public.update_ticket_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.has_update IS DISTINCT FROM OLD.has_update
     AND NEW.has_update = false
     AND OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.has_update = true;
    NEW.last_update_type = 'status_change';
    NEW.last_update_by = COALESCE(
      public.resolve_profile_id((SELECT auth.uid())),
      NEW.last_update_by
    );
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    NEW.has_update = true;
    NEW.last_update_type = 'assignment';
    NEW.last_update_by = COALESCE(
      public.resolve_profile_id((SELECT auth.uid())),
      NEW.last_update_by
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticket_status_notification ON public.tickets;
CREATE TRIGGER ticket_status_notification
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_status_notification();

CREATE INDEX IF NOT EXISTS idx_tickets_has_update ON public.tickets (has_update) WHERE has_update = true;
CREATE INDEX IF NOT EXISTS idx_tickets_last_update_by ON public.tickets (last_update_by);

CREATE OR REPLACE FUNCTION public.mark_ticket_update_as_read(ticket_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id_param
        AND public.current_user_role() = 'cliente'
        AND t.client_id = public.current_client_id()
    )
  ) THEN
    RAISE EXCEPTION 'No autorizado para marcar este ticket como leído';
  END IF;

  UPDATE public.tickets
  SET
    has_update = false,
    last_update_by = NULL,
    last_update_type = NULL
  WHERE id = ticket_id_param;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_ticket_update_as_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_ticket_update_as_read(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_profile_id(uuid) TO authenticated, service_role;

CREATE OR REPLACE VIEW public.tickets_with_pending_updates
WITH (security_invoker = true)
AS
SELECT
  t.*,
  c.name AS client_name,
  trim(both FROM coalesce(u_assigned.first_name, '') || ' ' || coalesce(u_assigned.last_name, '')) AS assigned_user_name,
  trim(both FROM coalesce(u_created.first_name, '') || ' ' || coalesce(u_created.last_name, '')) AS created_by_name,
  trim(both FROM coalesce(u_updated.first_name, '') || ' ' || coalesce(u_updated.last_name, '')) AS last_updated_by_name
FROM public.tickets t
LEFT JOIN public.clients c ON t.client_id = c.id
LEFT JOIN public.profiles u_assigned ON t.assigned_to = u_assigned.id
LEFT JOIN public.profiles u_created ON t.created_by = u_created.user_id
LEFT JOIN public.profiles u_updated ON t.last_update_by = u_updated.id
WHERE t.has_update = true;

GRANT SELECT ON public.tickets_with_pending_updates TO authenticated;
