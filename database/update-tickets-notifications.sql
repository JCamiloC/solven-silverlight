-- =====================================================
-- ACTUALIZAR TICKETS PARA SISTEMA DE NOTIFICACIONES
-- =====================================================
-- Agregar funcionalidad para notificar actualizaciones de tickets

-- 1. Agregar campo has_update a la tabla tickets
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS has_update BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_update_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS last_update_type VARCHAR(50);

-- 2. Agregar comentarios a las nuevas columnas
COMMENT ON COLUMN tickets.has_update IS 'Indica si hay una actualización pendiente de notificar';
COMMENT ON COLUMN tickets.last_update_by IS 'Usuario que realizó la última actualización';
COMMENT ON COLUMN tickets.last_update_type IS 'Tipo de actualización: comment, status_change, assignment';

-- 3. Agregar campo commenter_name a ticket_comments
ALTER TABLE ticket_comments 
ADD COLUMN IF NOT EXISTS commenter_name TEXT,
ADD COLUMN IF NOT EXISTS commenter_role VARCHAR(50);

-- 4. Agregar comentarios
COMMENT ON COLUMN ticket_comments.commenter_name IS 'Nombre completo de quien realiza el comentario';
COMMENT ON COLUMN ticket_comments.commenter_role IS 'Rol del comentarista: cliente, agente_soporte, lider_soporte, administrador';

-- 5. Crear función para actualizar has_update automáticamente
CREATE OR REPLACE FUNCTION update_ticket_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar el ticket con información de la actualización
  UPDATE tickets 
  SET 
    has_update = true,
    last_update_by = NEW.created_by,
    last_update_type = 'comment',
    updated_at = NOW()
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear trigger para comentarios
DROP TRIGGER IF EXISTS ticket_comment_notification ON ticket_comments;
CREATE TRIGGER ticket_comment_notification
  AFTER INSERT ON ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_notification();

-- 7. Crear función para actualizar has_update cuando cambia el estado
CREATE OR REPLACE FUNCTION update_ticket_status_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si el estado cambió
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.has_update = true;
    NEW.last_update_type = 'status_change';
  END IF;
  
  -- Solo actualizar si cambió la asignación
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    NEW.has_update = true;
    NEW.last_update_type = 'assignment';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear trigger para cambios de estado/asignación
DROP TRIGGER IF EXISTS ticket_status_notification ON tickets;
CREATE TRIGGER ticket_status_notification
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_status_notification();

-- 9. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_tickets_has_update ON tickets(has_update) WHERE has_update = true;
CREATE INDEX IF NOT EXISTS idx_tickets_last_update_by ON tickets(last_update_by);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_by ON ticket_comments(created_by);

-- =====================================================
-- FUNCIÓN PARA MARCAR NOTIFICACIÓN COMO LEÍDA
-- =====================================================
-- Esta función se llamará cuando el usuario vea la actualización
CREATE OR REPLACE FUNCTION mark_ticket_update_as_read(ticket_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE tickets 
  SET 
    has_update = false,
    last_update_by = NULL,
    last_update_type = NULL
  WHERE id = ticket_id_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTA PARA TICKETS CON NOTIFICACIONES PENDIENTES
-- =====================================================
-- Vista que muestra tickets que requieren atención del usuario actual
CREATE OR REPLACE VIEW tickets_with_pending_updates AS
SELECT 
  t.*,
  c.name as client_name,
  u_assigned.first_name || ' ' || u_assigned.last_name as assigned_user_name,
  u_created.first_name || ' ' || u_created.last_name as created_by_name,
  u_updated.first_name || ' ' || u_updated.last_name as last_updated_by_name
FROM tickets t
LEFT JOIN clients c ON t.client_id = c.id
LEFT JOIN profiles u_assigned ON t.assigned_to = u_assigned.id
LEFT JOIN profiles u_created ON t.created_by = u_created.id
LEFT JOIN profiles u_updated ON t.last_update_by = u_updated.id
WHERE t.has_update = true;



-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta esto para verificar los cambios:
-- 
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'tickets' AND column_name IN ('has_update', 'last_update_by', 'last_update_type')
-- ORDER BY ordinal_position;
--
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'ticket_comments' AND column_name IN ('commenter_name', 'commenter_role')
-- ORDER BY ordinal_position;
--
-- SELECT * FROM tickets_with_pending_updates;
