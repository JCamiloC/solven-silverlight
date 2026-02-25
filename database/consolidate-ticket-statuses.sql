-- =====================================================
-- CONSOLIDAR ESTADOS DE TICKETS
-- =====================================================
-- Objetivo:
-- 1) open + in_progress              -> open
-- 2) resolved + closed (+solucionado)-> solucionado
-- 3) Mantener pendiente_confirmacion

BEGIN;

-- 1) Eliminar constraints CHECK sobre status existentes (si las hay)
--    (debe ejecutarse ANTES del UPDATE para permitir el estado 'solucionado')
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'tickets'
      AND n.nspname = 'public'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.tickets DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2) Normalizar datos históricos
UPDATE tickets
SET
  status = CASE
    WHEN status IN ('open', 'in_progress') THEN 'open'
    WHEN status = 'pending' THEN 'pendiente_confirmacion'
    WHEN status IN ('resolved', 'closed', 'solucionado') THEN 'solucionado'
    ELSE status
  END,
  resolved_at = CASE
    WHEN status IN ('resolved', 'closed', 'solucionado')
      THEN COALESCE(resolved_at, NOW())
    ELSE resolved_at
  END
WHERE status IN ('open', 'in_progress', 'pending', 'resolved', 'closed', 'solucionado');

-- 3) Crear nuevo CHECK con estados consolidados
ALTER TABLE public.tickets
DROP CONSTRAINT IF EXISTS tickets_status_check;

ALTER TABLE public.tickets
ADD CONSTRAINT tickets_status_check
CHECK (status IN ('open', 'pendiente_confirmacion', 'solucionado'));

-- 4) Índice de apoyo
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);

COMMENT ON COLUMN public.tickets.status IS 'Estados válidos: open, pendiente_confirmacion, solucionado';

COMMIT;
