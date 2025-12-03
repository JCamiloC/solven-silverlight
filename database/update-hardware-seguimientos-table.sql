-- Migración: Actualizar tabla hardware_seguimientos
-- Fecha: 2025-12-03
-- Descripción: Agregar tipos fijos, actividades, y campo para foto

-- Paso 1: Modificar columna tipo para usar ENUM con tipos fijos
DO $$ 
BEGIN
  -- Crear tipo ENUM si no existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_seguimiento') THEN
    CREATE TYPE tipo_seguimiento AS ENUM (
      'mantenimiento_programado',
      'mantenimiento_no_programado',
      'soporte_remoto',
      'soporte_en_sitio'
    );
  END IF;
END $$;

-- Paso 2: Crear nueva columna temporal con el tipo ENUM
ALTER TABLE hardware_seguimientos 
ADD COLUMN IF NOT EXISTS tipo_nuevo tipo_seguimiento;

-- Paso 3: Migrar datos existentes mapeando a los nuevos valores
UPDATE hardware_seguimientos
SET tipo_nuevo = 
  CASE 
    WHEN LOWER(tipo) LIKE '%programado%' AND LOWER(tipo) NOT LIKE '%no programado%' THEN 'mantenimiento_programado'::tipo_seguimiento
    WHEN LOWER(tipo) LIKE '%no programado%' THEN 'mantenimiento_no_programado'::tipo_seguimiento
    WHEN LOWER(tipo) LIKE '%remoto%' THEN 'soporte_remoto'::tipo_seguimiento
    WHEN LOWER(tipo) LIKE '%sitio%' THEN 'soporte_en_sitio'::tipo_seguimiento
    ELSE 'soporte_remoto'::tipo_seguimiento -- valor por defecto
  END
WHERE tipo_nuevo IS NULL;

-- Paso 4: Eliminar columna antigua y renombrar la nueva
ALTER TABLE hardware_seguimientos DROP COLUMN IF EXISTS tipo;
ALTER TABLE hardware_seguimientos RENAME COLUMN tipo_nuevo TO tipo;

-- Paso 5: Agregar columna actividades (JSONB array para checkboxes)
ALTER TABLE hardware_seguimientos
ADD COLUMN IF NOT EXISTS actividades jsonb DEFAULT '[]'::jsonb;

-- Paso 6: Agregar columna para la foto/archivo
ALTER TABLE hardware_seguimientos
ADD COLUMN IF NOT EXISTS foto_url text;

-- Paso 7: Modificar created_at para tener valor por defecto
ALTER TABLE hardware_seguimientos
ALTER COLUMN created_at SET DEFAULT now();

-- Paso 8: Modificar fecha_registro para tener valor por defecto
ALTER TABLE hardware_seguimientos
ALTER COLUMN fecha_registro SET DEFAULT now();

-- Paso 9: Agregar NOT NULL a tipo
ALTER TABLE hardware_seguimientos
ALTER COLUMN tipo SET NOT NULL;

-- Paso 10: Agregar comentarios descriptivos
COMMENT ON COLUMN hardware_seguimientos.tipo IS 'Tipo de seguimiento: mantenimiento_programado, mantenimiento_no_programado, soporte_remoto, soporte_en_sitio';
COMMENT ON COLUMN hardware_seguimientos.actividades IS 'Array de actividades realizadas durante el seguimiento (formato JSON)';
COMMENT ON COLUMN hardware_seguimientos.foto_url IS 'URL de la foto/archivo adjunto del seguimiento (opcional)';

-- Paso 11: Crear índice para mejorar búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_hardware_seguimientos_tipo ON hardware_seguimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_hardware_seguimientos_fecha ON hardware_seguimientos(fecha_registro DESC);

-- Verificar estructura final
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'hardware_seguimientos'
ORDER BY ordinal_position;

-- Ejemplo de cómo quedarían los datos
-- SELECT 
--   id,
--   tipo,
--   actividades,
--   foto_url,
--   fecha_registro
-- FROM hardware_seguimientos
-- LIMIT 5;
