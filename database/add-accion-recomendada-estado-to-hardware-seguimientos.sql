-- Migración: Agregar estado para acción recomendada en seguimientos de hardware
-- Fecha: 2026-03-10

ALTER TABLE hardware_seguimientos
ADD COLUMN IF NOT EXISTS accion_recomendada_estado text;

-- Backfill seguro para datos existentes antes de aplicar restricciones
UPDATE hardware_seguimientos
SET accion_recomendada_estado = 'no_realizado'
WHERE accion_recomendada_estado IS NULL OR trim(accion_recomendada_estado) = '';

ALTER TABLE hardware_seguimientos
ALTER COLUMN accion_recomendada_estado SET DEFAULT 'no_realizado';

ALTER TABLE hardware_seguimientos
ALTER COLUMN accion_recomendada_estado SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hardware_seguimientos_accion_recomendada_estado_check'
  ) THEN
    ALTER TABLE hardware_seguimientos
    ADD CONSTRAINT hardware_seguimientos_accion_recomendada_estado_check
    CHECK (accion_recomendada_estado IN ('realizado', 'no_realizado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hardware_seguimientos_accion_estado
ON hardware_seguimientos(accion_recomendada_estado);

COMMENT ON COLUMN hardware_seguimientos.accion_recomendada_estado IS
'Estado de ejecución de la acción recomendada: realizado o no_realizado';
