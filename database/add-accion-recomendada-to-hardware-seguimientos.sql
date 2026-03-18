-- Migración: Agregar acción recomendada en seguimientos de hardware
-- Fecha: 2026-03-04

ALTER TABLE hardware_seguimientos
ADD COLUMN IF NOT EXISTS accion_recomendada text;

COMMENT ON COLUMN hardware_seguimientos.accion_recomendada IS 'Acción recomendada posterior al seguimiento técnico';
