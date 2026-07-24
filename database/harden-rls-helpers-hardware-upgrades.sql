-- Follow-up de optimize-rls-indexes-auth-cleanup.sql
-- Cierra hallazgos del linter de Supabase:
-- 1) Helper sin uso con search_path mutable
-- 2) Helpers SECURITY DEFINER ejecutables por anon vía /rest/v1/rpc
-- 3) hardware_upgrades con INSERT permisivo (WITH CHECK true)

-- =====================================================
-- 1. HELPER SIN USO
-- =====================================================
DROP FUNCTION IF EXISTS public.current_auth_uid();

-- =====================================================
-- 2. HELPERS SOLO PARA USUARIOS AUTENTICADOS
-- =====================================================
REVOKE EXECUTE ON FUNCTION public.current_profile_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_client_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_leader() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_client_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_leader() TO authenticated, service_role;

-- =====================================================
-- 3. HARDWARE UPGRADES (historial: solo staff escribe)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can insert hardware upgrades" ON public.hardware_upgrades;
DROP POLICY IF EXISTS "Authenticated users can view hardware upgrades" ON public.hardware_upgrades;
DROP POLICY IF EXISTS "hardware_upgrades_insert_staff" ON public.hardware_upgrades;
DROP POLICY IF EXISTS "hardware_upgrades_select" ON public.hardware_upgrades;

CREATE POLICY "hardware_upgrades_insert_staff"
ON public.hardware_upgrades FOR INSERT TO authenticated
WITH CHECK (public.is_staff());

CREATE POLICY "hardware_upgrades_select"
ON public.hardware_upgrades FOR SELECT TO authenticated
USING (
  public.is_staff()
  OR (
    public.current_user_role() = 'cliente'
    AND EXISTS (
      SELECT 1 FROM public.hardware_assets h
      WHERE h.id = hardware_upgrades.hardware_id
        AND h.client_id = public.current_client_id()
    )
  )
);
