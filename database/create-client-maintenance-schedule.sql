-- =====================================================
-- MÓDULO: MANTENIMIENTOS PROGRAMADOS POR CLIENTE
-- =====================================================

CREATE TABLE IF NOT EXISTS client_maintenance_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  slot_number INTEGER NOT NULL,
  expected_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'realizado', 'reprogramado', 'omitido')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  related_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, year, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_client_maintenance_client_year
  ON client_maintenance_schedule(client_id, year);

CREATE INDEX IF NOT EXISTS idx_client_maintenance_status
  ON client_maintenance_schedule(status);

DROP TRIGGER IF EXISTS update_client_maintenance_schedule_updated_at ON client_maintenance_schedule;
CREATE TRIGGER update_client_maintenance_schedule_updated_at
  BEFORE UPDATE ON client_maintenance_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS temporalmente deshabilitado durante desarrollo.
-- (Se reactivará al cierre del aplicativo.)
ALTER TABLE client_maintenance_schedule DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Maintenance schedule select" ON client_maintenance_schedule;
DROP POLICY IF EXISTS "Maintenance schedule write" ON client_maintenance_schedule;

COMMENT ON TABLE client_maintenance_schedule IS 'Agenda de mantenimientos programados por cliente y año';
COMMENT ON COLUMN client_maintenance_schedule.slot_number IS 'Posición del mantenimiento en el año (1..N)';
COMMENT ON COLUMN client_maintenance_schedule.expected_date IS 'Fecha programada esperada del mantenimiento';
COMMENT ON COLUMN client_maintenance_schedule.status IS 'Estados: pendiente, realizado, reprogramado, omitido';
