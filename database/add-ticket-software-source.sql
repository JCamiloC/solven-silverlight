-- =====================================================
-- AGREGAR COLUMNA software_source A TICKETS
-- =====================================================
-- Permite distinguir si software_id apunta a:
-- - software_licenses (license)
-- - custom_applications (custom_app)

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS software_source TEXT;

-- Constraint para asegurar valores válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tickets_software_source_check'
  ) THEN
    ALTER TABLE tickets
    ADD CONSTRAINT tickets_software_source_check
    CHECK (software_source IN ('license', 'custom_app') OR software_source IS NULL);
  END IF;
END $$;

-- Índice para filtros/reportes
CREATE INDEX IF NOT EXISTS idx_tickets_software_source ON tickets(software_source);

COMMENT ON COLUMN tickets.software_source IS 'Origen de software_id: license (software_licenses) o custom_app (custom_applications)';

-- =====================================================
-- BACKFILL OPCIONAL
-- =====================================================
-- Si quieres marcar históricos que ya tienen software_id como licencias:
-- UPDATE tickets
-- SET software_source = 'license'
-- WHERE software_id IS NOT NULL
--   AND software_source IS NULL;
