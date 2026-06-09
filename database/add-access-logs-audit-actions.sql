-- Ampliar access_logs para auditar creación, edición y eliminación de credenciales.
-- Los registros de auditoría persisten aunque se elimine la credencial (ON DELETE SET NULL).

ALTER TABLE access_logs
  ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT 'view'
    CHECK (action IN ('view', 'create', 'update', 'delete')),
  ADD COLUMN IF NOT EXISTS credential_system_name TEXT,
  ADD COLUMN IF NOT EXISTS credential_username TEXT,
  ADD COLUMN IF NOT EXISTS details JSONB;

ALTER TABLE access_logs
  ALTER COLUMN credential_id DROP NOT NULL;

ALTER TABLE access_logs
  DROP CONSTRAINT IF EXISTS access_logs_credential_id_fkey;

ALTER TABLE access_logs
  ADD CONSTRAINT access_logs_credential_id_fkey
  FOREIGN KEY (credential_id)
  REFERENCES access_credentials(id)
  ON DELETE SET NULL;
