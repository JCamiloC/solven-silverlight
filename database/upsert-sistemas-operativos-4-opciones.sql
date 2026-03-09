-- =====================================================
-- PARAMETRO: sistemas_operativos
-- Restaura y amplia opciones para formularios de hardware.
-- IMPORTANTE: conserva las opciones existentes y agrega catalogo extendido
-- (Windows, Linux, Android, macOS, etc.) sin duplicados.
-- =====================================================

BEGIN;

WITH catalogo_base AS (
  SELECT jsonb_array_elements(
    '[
      {"value":"Windows 10 Home","label":"Windows 10 Home"},
      {"value":"Windows 10 Professional","label":"Windows 10 Professional"},
      {"value":"Windows 11 Home","label":"Windows 11 Home"},
      {"value":"Windows 11 Professional","label":"Windows 11 Professional"},
      {"value":"Windows Server","label":"Windows Server"},
      {"value":"Ubuntu","label":"Ubuntu"},
      {"value":"Debian","label":"Debian"},
      {"value":"Fedora","label":"Fedora"},
      {"value":"CentOS","label":"CentOS"},
      {"value":"Red Hat Enterprise Linux","label":"Red Hat Enterprise Linux"},
      {"value":"Linux Mint","label":"Linux Mint"},
      {"value":"Kali Linux","label":"Kali Linux"},
      {"value":"Android","label":"Android"},
      {"value":"iOS","label":"iOS"},
      {"value":"macOS","label":"macOS"},
      {"value":"ChromeOS","label":"ChromeOS"},
      {"value":"Otro","label":"Otro"}
    ]'::jsonb
  ) AS opt
),
existentes AS (
  SELECT jsonb_array_elements(coalesce(p.options, '[]'::jsonb)) AS opt
  FROM parametros p
  WHERE p.key = 'sistemas_operativos'
),
unificado AS (
  SELECT opt FROM catalogo_base
  UNION ALL
  SELECT opt FROM existentes
),
normalizado AS (
  SELECT
    CASE
      WHEN jsonb_typeof(opt) = 'object' THEN
        jsonb_build_object(
          'value', coalesce(nullif(opt->>'value', ''), opt->>'label'),
          'label', coalesce(nullif(opt->>'label', ''), opt->>'value')
        )
      WHEN jsonb_typeof(opt) = 'string' THEN
        jsonb_build_object(
          'value', trim(both '"' FROM opt::text),
          'label', trim(both '"' FROM opt::text)
        )
      ELSE NULL
    END AS opt
  FROM unificado
),
deduplicado AS (
  SELECT DISTINCT ON (lower(opt->>'value')) opt
  FROM normalizado
  WHERE opt IS NOT NULL
    AND coalesce(opt->>'value', '') <> ''
  ORDER BY lower(opt->>'value')
),
opciones_finales AS (
  SELECT coalesce(jsonb_agg(opt ORDER BY lower(opt->>'label')), '[]'::jsonb) AS options
  FROM deduplicado
)
INSERT INTO parametros (key, name, description, options, metadata, client_specific)
SELECT
  'sistemas_operativos',
  'Sistemas Operativos',
  'Opciones de sistema operativo para activos de hardware',
  opciones_finales.options,
  '{}'::jsonb,
  false
FROM opciones_finales
ON CONFLICT (key)
DO UPDATE SET
  options = EXCLUDED.options,
  name = COALESCE(parametros.name, EXCLUDED.name),
  description = COALESCE(parametros.description, EXCLUDED.description),
  updated_at = NOW();

-- Verificacion rapida
SELECT
  key,
  name,
  options
FROM parametros
WHERE key = 'sistemas_operativos';

COMMIT;
