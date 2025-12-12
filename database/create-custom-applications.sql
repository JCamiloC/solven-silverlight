-- =====================================================
-- CREAR TABLA DE APLICACIONES PERSONALIZADAS
-- =====================================================
-- Tabla para registrar aplicaciones desarrolladas/personalizadas para clientes

CREATE TABLE IF NOT EXISTS custom_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Información Básica
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'development', 'maintenance', 'inactive')) DEFAULT 'active',
  
  -- URLs
  production_url TEXT,
  staging_url TEXT,
  development_url TEXT,
  admin_panel_url TEXT,
  
  -- Hosting
  hosting_provider TEXT,
  hosting_plan TEXT,
  hosting_renewal_date DATE,
  
  -- Dominio
  domain_registrar TEXT,
  domain_expiry_date DATE,
  
  -- Base de Datos
  database_type TEXT,
  database_host TEXT,
  database_name TEXT,
  
  -- Repositorio
  repository_url TEXT,
  repository_branch TEXT DEFAULT 'main',
  
  -- Tecnologías
  frontend_tech TEXT,
  backend_tech TEXT,
  mobile_tech TEXT,
  
  -- Additional
  ssl_certificate TEXT,
  cdn_provider TEXT,
  
  -- Notas
  notes TEXT,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREAR TABLA DE SEGUIMIENTOS DE APLICACIONES
-- =====================================================
-- Similar a hardware_seguimientos pero para aplicaciones

CREATE TABLE IF NOT EXISTS custom_app_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES custom_applications(id) ON DELETE CASCADE,
  
  -- Información del seguimiento
  fecha_registro TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'actualizacion',
    'mantenimiento',
    'soporte',
    'backup',
    'migracion',
    'optimizacion',
    'bug_fix',
    'nueva_funcionalidad',
    'otro'
  )),
  
  -- Actividades realizadas
  actividades TEXT[] DEFAULT '{}',
  detalle TEXT NOT NULL,
  
  -- Evidencia
  foto_url TEXT, -- URL de la foto en Supabase Storage si se sube
  
  -- Responsable
  tecnico_responsable TEXT NOT NULL,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_custom_applications_client_id ON custom_applications(client_id);
CREATE INDEX IF NOT EXISTS idx_custom_applications_status ON custom_applications(status);
CREATE INDEX IF NOT EXISTS idx_custom_applications_domain_expiry ON custom_applications(domain_expiry_date);
CREATE INDEX IF NOT EXISTS idx_custom_applications_hosting_renewal ON custom_applications(hosting_renewal_date);

CREATE INDEX IF NOT EXISTS idx_custom_app_followups_application_id ON custom_app_followups(application_id);
CREATE INDEX IF NOT EXISTS idx_custom_app_followups_tipo ON custom_app_followups(tipo);
CREATE INDEX IF NOT EXISTS idx_custom_app_followups_fecha ON custom_app_followups(fecha_registro);

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE custom_applications IS 'Aplicaciones personalizadas desarrolladas para clientes';
COMMENT ON TABLE custom_app_followups IS 'Seguimientos de mantenimiento y actualizaciones de aplicaciones';

COMMENT ON COLUMN custom_applications.status IS 'Estado: active, development, maintenance, deprecated, inactive';
COMMENT ON COLUMN custom_applications.app_url IS 'URL de acceso a la aplicación';
COMMENT ON COLUMN custom_applications.admin_panel_url IS 'URL del panel de administración';
COMMENT ON COLUMN custom_applications.hosting_provider IS 'Proveedor de hosting (AWS, DigitalOcean, etc.)';
COMMENT ON COLUMN custom_applications.database_type IS 'Tipo de base de datos (PostgreSQL, MySQL, MongoDB, etc.)';
COMMENT ON COLUMN custom_applications.programming_language IS 'Lenguaje principal (PHP, Python, Node.js, etc.)';
COMMENT ON COLUMN custom_applications.framework IS 'Framework utilizado (Laravel, Django, Express, etc.)';

COMMENT ON COLUMN custom_app_followups.tipo IS 'Tipo de seguimiento: actualizacion, mantenimiento, soporte, backup, migracion, optimizacion, bug_fix, nueva_funcionalidad, otro';
COMMENT ON COLUMN custom_app_followups.actividades IS 'Array de actividades realizadas';
COMMENT ON COLUMN custom_app_followups.foto_url IS 'URL de evidencia fotográfica en Supabase Storage';

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_custom_applications_updated_at 
  BEFORE UPDATE ON custom_applications 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_app_followups_updated_at 
  BEFORE UPDATE ON custom_app_followups 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DESHABILITAR RLS (TEMPORALMENTE PARA DESARROLLO)
-- =====================================================

ALTER TABLE custom_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_app_followups DISABLE ROW LEVEL SECURITY;

-- NOTA: En producción habilitar RLS y crear políticas apropiadas
-- ALTER TABLE custom_applications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE custom_app_followups ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STORAGE BUCKET PARA FOTOS DE SEGUIMIENTOS
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custom-app-followups',
  'custom-app-followups',
  true, -- PÚBLICO TEMPORALMENTE
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta esto para verificar que todo se creó correctamente:
-- 
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'custom_applications'
-- ORDER BY ordinal_position;
--
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'custom_app_followups'
-- ORDER BY ordinal_position;
--
-- SELECT * FROM storage.buckets WHERE id = 'custom-app-followups';
