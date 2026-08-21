-- Unicidad de NIT normalizado (solo dígitos), permite NULL/vacío
CREATE UNIQUE INDEX IF NOT EXISTS clients_nit_unique_normalized
ON public.clients (regexp_replace(lower(btrim(nit)), '[^0-9]', '', 'g'))
WHERE nit IS NOT NULL AND btrim(nit) <> '';

COMMENT ON INDEX public.clients_nit_unique_normalized IS
  'Evita clientes duplicados por NIT (ignora guiones/espacios; compara solo dígitos)';
