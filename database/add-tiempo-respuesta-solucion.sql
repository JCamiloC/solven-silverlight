-- Agregar columnas de tiempo de respuesta y tiempo de solución a la tabla tickets
-- Fecha: 2024
-- Descripción: Agregar campos para tracking manual de tiempos de respuesta y solución

-- Agregar columna tiempo_respuesta
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS tiempo_respuesta text;

-- Agregar columna tiempo_solucion
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS tiempo_solucion text;

-- Agregar comentarios para documentación
COMMENT ON COLUMN tickets.tiempo_respuesta IS 'Tiempo transcurrido desde la creación hasta la primera respuesta (ingreso manual)';
COMMENT ON COLUMN tickets.tiempo_solucion IS 'Tiempo transcurrido desde la creación hasta la solución del ticket (ingreso manual)';

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets' 
  AND column_name IN ('tiempo_respuesta', 'tiempo_solucion');
