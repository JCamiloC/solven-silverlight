-- Tabla para historial de actualizaciones físicas de hardware
-- Guarda cambios en procesador, RAM y disco duro

CREATE TABLE IF NOT EXISTS hardware_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hardware_id UUID NOT NULL REFERENCES hardware_assets(id) ON DELETE CASCADE,
  
  -- Valores anteriores
  previous_procesador TEXT,
  previous_memoria_ram TEXT,
  previous_disco_duro TEXT,
  
  -- Valores nuevos
  new_procesador TEXT,
  new_memoria_ram TEXT,
  new_disco_duro TEXT,
  
  -- Campos cambiados (para saber qué se actualizó)
  changed_fields TEXT[] NOT NULL,
  
  -- Información de auditoría
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  update_reason TEXT, -- Razón del cambio (opcional)
  notes TEXT, -- Notas adicionales (opcional)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX idx_hardware_upgrades_hardware_id ON hardware_upgrades(hardware_id);
CREATE INDEX idx_hardware_upgrades_created_at ON hardware_upgrades(created_at DESC);
CREATE INDEX idx_hardware_upgrades_updated_by ON hardware_upgrades(updated_by);

-- RLS Policies
ALTER TABLE hardware_upgrades ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios autenticados pueden ver upgrades
CREATE POLICY "Authenticated users can view hardware upgrades"
  ON hardware_upgrades FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Usuarios autenticados pueden insertar upgrades
CREATE POLICY "Authenticated users can insert hardware upgrades"
  ON hardware_upgrades FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE hardware_upgrades IS 'Historial de actualizaciones físicas de hardware (procesador, RAM, disco duro)';
COMMENT ON COLUMN hardware_upgrades.changed_fields IS 'Array de campos que cambiaron: ["procesador", "memoria_ram", "disco_duro"]';
COMMENT ON COLUMN hardware_upgrades.update_reason IS 'Razón del cambio: upgrade, reemplazo, mantenimiento, etc.';
