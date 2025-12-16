-- Agregar campo usuario_afectado a la tabla tickets
-- Este campo almacena el nombre del usuario que reporta el problema

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS usuario_afectado TEXT;

-- Agregar comentario para documentar
COMMENT ON COLUMN tickets.usuario_afectado IS 'Nombre del usuario que reporta o es afectado por el problema';

-- Opcional: Crear índice si se planea filtrar por este campo
CREATE INDEX IF NOT EXISTS idx_tickets_usuario_afectado ON tickets(usuario_afectado);
