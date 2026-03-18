-- =====================================================
-- MÓDULO: VISITAS TÉCNICAS POR CLIENTE
-- =====================================================
-- Objetivo:
-- - Registrar visitas técnicas separadas de tickets/seguimientos
-- - Permitir una visita con múltiples equipos atendidos
-- - Mantener trazabilidad y facilitar reportes por visita/equipo

CREATE TABLE IF NOT EXISTS client_visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fecha_visita TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo TEXT NOT NULL CHECK (tipo IN ('programada', 'no_programada', 'diagnostico', 'mantenimiento', 'soporte', 'otro')),
  estado TEXT NOT NULL DEFAULT 'completada' CHECK (estado IN ('completada', 'pendiente', 'cancelada')),
  detalle TEXT NOT NULL,
  actividades JSONB NOT NULL DEFAULT '[]'::jsonb,
  recomendaciones TEXT,
  tecnico_responsable UUID REFERENCES profiles(id) ON DELETE SET NULL,
  creado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_visita_equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES client_visitas(id) ON DELETE CASCADE,
  hardware_id UUID REFERENCES hardware_assets(id) ON DELETE SET NULL,
  hardware_nombre_manual TEXT,
  tareas_realizadas TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_visita_equipos_hardware_required_chk CHECK (
    hardware_id IS NOT NULL OR COALESCE(NULLIF(TRIM(hardware_nombre_manual), ''), '') <> ''
  )
);

CREATE INDEX IF NOT EXISTS idx_client_visitas_client_fecha
  ON client_visitas(client_id, fecha_visita DESC);

CREATE INDEX IF NOT EXISTS idx_client_visitas_tipo
  ON client_visitas(tipo);

CREATE INDEX IF NOT EXISTS idx_client_visitas_estado
  ON client_visitas(estado);

CREATE INDEX IF NOT EXISTS idx_client_visita_equipos_visita
  ON client_visita_equipos(visita_id);

CREATE INDEX IF NOT EXISTS idx_client_visita_equipos_hardware
  ON client_visita_equipos(hardware_id);

DROP TRIGGER IF EXISTS update_client_visitas_updated_at ON client_visitas;
CREATE TRIGGER update_client_visitas_updated_at
  BEFORE UPDATE ON client_visitas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS temporalmente deshabilitado durante desarrollo
ALTER TABLE client_visitas DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_visita_equipos DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE client_visitas IS 'Registro de visitas técnicas realizadas a clientes';
COMMENT ON TABLE client_visita_equipos IS 'Detalle de equipos atendidos por cada visita técnica';
COMMENT ON COLUMN client_visitas.tipo IS 'Tipo de visita: programada, no_programada, diagnostico, mantenimiento, soporte, otro';
COMMENT ON COLUMN client_visitas.estado IS 'Estado de la visita: completada, pendiente, cancelada';
COMMENT ON COLUMN client_visitas.actividades IS 'Listado (JSON array) de actividades generales realizadas durante la visita';
COMMENT ON COLUMN client_visita_equipos.tareas_realizadas IS 'Tareas específicas realizadas sobre el equipo seleccionado';
COMMENT ON COLUMN client_visita_equipos.hardware_nombre_manual IS 'Nombre de equipo manual cuando no existe en inventario';
