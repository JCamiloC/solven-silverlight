-- =====================================================
-- NORMALIZAR SISTEMA OPERATIVO A EDICIONES PROFESSIONAL
-- Reglas:
--   Windows 10              -> Windows 10 Professional
--   Windows 11              -> Windows 11 Professional
--   Windows 10 Home         -> Windows 10 Professional
--   Windows 11 Home         -> Windows 11 Professional
--
-- Diseñado para columna: hardware_assets.sistema_operativo
-- Nota: en algunos entornos sistema_operativo es TEXT.
-- Este script soporta ambos formatos serializados en texto:
--   1) Objeto JSON: {"nombre":"Windows 10", ...}
--   2) String JSON: "Windows 10"
--   3) Texto plano: Windows 10
-- =====================================================

BEGIN;

-- Parser seguro de JSON para columnas tipo text
CREATE OR REPLACE FUNCTION pg_temp.try_parse_jsonb(input_text text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN input_text::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- 1) Vista previa de registros que seran impactados
SELECT
  id,
  sistema_operativo
FROM hardware_assets
WHERE
  (
    pg_temp.try_parse_jsonb(sistema_operativo) IS NOT NULL
    AND jsonb_typeof(pg_temp.try_parse_jsonb(sistema_operativo)) = 'object'
    AND coalesce((pg_temp.try_parse_jsonb(sistema_operativo))->>'nombre', '') ~* 'windows\s*1(0|1)'
  )
  OR
  (
    pg_temp.try_parse_jsonb(sistema_operativo) IS NOT NULL
    AND jsonb_typeof(pg_temp.try_parse_jsonb(sistema_operativo)) = 'string'
    AND trim(both '"' FROM (pg_temp.try_parse_jsonb(sistema_operativo))::text) ~* 'windows\s*1(0|1)'
  )
  OR
  (
    pg_temp.try_parse_jsonb(sistema_operativo) IS NULL
    AND coalesce(sistema_operativo, '') ~* 'windows\s*1(0|1)'
  );

-- 2) Actualizar cuando sistema_operativo es objeto JSON serializado en text
UPDATE hardware_assets
SET
  sistema_operativo = (
    jsonb_set(
      pg_temp.try_parse_jsonb(sistema_operativo),
      '{nombre}',
      to_jsonb(
        CASE
          WHEN coalesce((pg_temp.try_parse_jsonb(sistema_operativo))->>'nombre', '') ~* 'windows\s*10' THEN 'Windows 10 Professional'
          WHEN coalesce((pg_temp.try_parse_jsonb(sistema_operativo))->>'nombre', '') ~* 'windows\s*11' THEN 'Windows 11 Professional'
          ELSE coalesce((pg_temp.try_parse_jsonb(sistema_operativo))->>'nombre', '')
        END
      ),
      true
    )::text
  ),
  updated_at = NOW()
WHERE
  pg_temp.try_parse_jsonb(sistema_operativo) IS NOT NULL
  AND jsonb_typeof(pg_temp.try_parse_jsonb(sistema_operativo)) = 'object'
  AND coalesce((pg_temp.try_parse_jsonb(sistema_operativo))->>'nombre', '') ~* 'windows\s*1(0|1)';

-- 3) Actualizar cuando sistema_operativo es string JSON serializado en text
UPDATE hardware_assets
SET
  sistema_operativo = (
    to_jsonb(
      CASE
        WHEN trim(both '"' FROM (pg_temp.try_parse_jsonb(sistema_operativo))::text) ~* 'windows\s*10' THEN 'Windows 10 Professional'
        WHEN trim(both '"' FROM (pg_temp.try_parse_jsonb(sistema_operativo))::text) ~* 'windows\s*11' THEN 'Windows 11 Professional'
        ELSE trim(both '"' FROM (pg_temp.try_parse_jsonb(sistema_operativo))::text)
      END
    )::text
  ),
  updated_at = NOW()
WHERE
  pg_temp.try_parse_jsonb(sistema_operativo) IS NOT NULL
  AND jsonb_typeof(pg_temp.try_parse_jsonb(sistema_operativo)) = 'string'
  AND trim(both '"' FROM (pg_temp.try_parse_jsonb(sistema_operativo))::text) ~* 'windows\s*1(0|1)';

-- 4) Actualizar cuando sistema_operativo es texto plano
UPDATE hardware_assets
SET
  sistema_operativo = CASE
    WHEN coalesce(sistema_operativo, '') ~* 'windows\s*10' THEN 'Windows 10 Professional'
    WHEN coalesce(sistema_operativo, '') ~* 'windows\s*11' THEN 'Windows 11 Professional'
    ELSE sistema_operativo
  END,
  updated_at = NOW()
WHERE
  pg_temp.try_parse_jsonb(sistema_operativo) IS NULL
  AND coalesce(sistema_operativo, '') ~* 'windows\s*1(0|1)';

-- 5) Resumen post-actualizacion
SELECT
  CASE
    WHEN pg_temp.try_parse_jsonb(sistema_operativo) IS NOT NULL
      AND jsonb_typeof(pg_temp.try_parse_jsonb(sistema_operativo)) = 'object'
      THEN coalesce((pg_temp.try_parse_jsonb(sistema_operativo))->>'nombre', 'Sin nombre')
    WHEN pg_temp.try_parse_jsonb(sistema_operativo) IS NOT NULL
      AND jsonb_typeof(pg_temp.try_parse_jsonb(sistema_operativo)) = 'string'
      THEN trim(both '"' FROM (pg_temp.try_parse_jsonb(sistema_operativo))::text)
    ELSE coalesce(sistema_operativo, 'Otro formato')
  END AS sistema_operativo_nombre,
  COUNT(*) AS total
FROM hardware_assets
GROUP BY 1
ORDER BY total DESC;

COMMIT;
