-- =====================================================
-- ACTUALIZAR ESTRUCTURA DE TABLA TICKETS
-- =====================================================
-- Agregar columnas necesarias para el nuevo flujo de tickets

-- 1. Agregar campo de email de contacto
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 2. Agregar campos para archivo adjunto
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- 3. Agregar campos para relacionar con hardware, software o accesos
-- Sin foreign keys por ahora, solo UUIDs
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS hardware_id UUID,
ADD COLUMN IF NOT EXISTS software_id UUID,
ADD COLUMN IF NOT EXISTS access_credential_id UUID;

-- 4. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_tickets_hardware_id ON tickets(hardware_id);
CREATE INDEX IF NOT EXISTS idx_tickets_software_id ON tickets(software_id);
CREATE INDEX IF NOT EXISTS idx_tickets_access_credential_id ON tickets(access_credential_id);
CREATE INDEX IF NOT EXISTS idx_tickets_contact_email ON tickets(contact_email);

-- 5. Agregar comentario a las columnas para documentación
COMMENT ON COLUMN tickets.contact_email IS 'Email de contacto para notificaciones del ticket';
COMMENT ON COLUMN tickets.attachment_url IS 'URL del archivo adjunto en Supabase Storage';
COMMENT ON COLUMN tickets.attachment_name IS 'Nombre original del archivo adjunto';
COMMENT ON COLUMN tickets.attachment_size IS 'Tamaño del archivo en bytes (máx 5MB)';
COMMENT ON COLUMN tickets.hardware_id IS 'Referencia al hardware relacionado (si aplica)';
COMMENT ON COLUMN tickets.software_id IS 'Referencia al software relacionado (si aplica)';
COMMENT ON COLUMN tickets.access_credential_id IS 'Referencia al acceso relacionado (si aplica)';

-- =====================================================
-- ACTUALIZAR POLÍTICAS RLS PARA NUEVAS COLUMNAS
-- =====================================================
-- Las políticas existentes ya cubren estas columnas automáticamente
-- No es necesario actualizar las políticas RLS

-- =====================================================
-- CONFIGURAR STORAGE BUCKET PARA ARCHIVOS
-- =====================================================
-- Crear bucket para adjuntos de tickets si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  true, -- PÚBLICO TEMPORALMENTE - Sin RLS para desarrollo
  5242880, -- 5MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- NOTA: En producción cambiar public = false y activar RLS con políticas

-- =====================================================
-- VERIFICAR CAMBIOS
-- =====================================================
-- Ejecuta esto para verificar que todo se creó correctamente:
-- 
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'tickets'
-- ORDER BY ordinal_position;
--
-- SELECT * FROM storage.buckets WHERE id = 'ticket-attachments';
