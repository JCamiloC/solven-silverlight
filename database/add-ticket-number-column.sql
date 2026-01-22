-- =====================================================
-- Script para agregar numeración incremental a tickets
-- Formato: Silver[YYYYMMDD]-[###]
-- Ejemplo: Silver20260122-001
-- =====================================================

-- 1. Agregar columna ticket_number
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50) UNIQUE;

-- 2. Crear secuencia para el contador diario
CREATE SEQUENCE IF NOT EXISTS ticket_daily_seq;

-- 3. Crear función para generar el número de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  today_date TEXT;
  today_count INT;
  new_ticket_number TEXT;
BEGIN
  -- Obtener fecha en formato YYYYMMDD
  today_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  -- Contar cuántos tickets se han creado hoy
  SELECT COUNT(*) + 1 INTO today_count
  FROM tickets
  WHERE ticket_number LIKE 'Silver' || today_date || '%';
  
  -- Generar el número de ticket con formato Silver[YYYYMMDD]-[###]
  new_ticket_number := 'Silver' || today_date || '-' || LPAD(today_count::TEXT, 3, '0');
  
  -- Asignar el número generado
  NEW.ticket_number := new_ticket_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger para generar automáticamente el ticket_number al insertar
DROP TRIGGER IF EXISTS set_ticket_number ON tickets;
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION generate_ticket_number();

-- 5. Generar ticket_numbers para tickets existentes (si los hay)
DO $$
DECLARE
  ticket_record RECORD;
  ticket_date TEXT;
  daily_count INT;
  new_number TEXT;
BEGIN
  -- Inicializar contador por fecha
  daily_count := 0;
  ticket_date := '';
  
  -- Iterar sobre todos los tickets sin ticket_number, ordenados por created_at
  FOR ticket_record IN 
    SELECT id, created_at
    FROM tickets
    WHERE ticket_number IS NULL
    ORDER BY created_at ASC
  LOOP
    -- Si cambió la fecha, reiniciar el contador
    IF TO_CHAR(ticket_record.created_at, 'YYYYMMDD') != ticket_date THEN
      ticket_date := TO_CHAR(ticket_record.created_at, 'YYYYMMDD');
      daily_count := 1;
    ELSE
      daily_count := daily_count + 1;
    END IF;
    
    -- Generar el número de ticket
    new_number := 'Silver' || ticket_date || '-' || LPAD(daily_count::TEXT, 3, '0');
    
    -- Actualizar el registro
    UPDATE tickets
    SET ticket_number = new_number
    WHERE id = ticket_record.id;
  END LOOP;
END $$;

-- 6. Crear índice para mejorar el rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_created_date ON tickets(created_at);

-- 7. Agregar comentario a la columna
COMMENT ON COLUMN tickets.ticket_number IS 'Número de ticket legible en formato Silver[YYYYMMDD]-[###]';

-- 8. Verificar que todos los tickets tienen ticket_number
DO $$
DECLARE
  missing_count INT;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM tickets
  WHERE ticket_number IS NULL;
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Hay % tickets sin ticket_number asignado', missing_count;
  ELSE
    RAISE NOTICE 'Todos los tickets tienen ticket_number asignado correctamente';
  END IF;
END $$;

-- =====================================================
-- Script completado exitosamente
-- =====================================================
