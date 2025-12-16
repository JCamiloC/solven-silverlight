-- =====================================================
-- MIGRACIÓN: Agregar columnas faltantes a custom_applications
-- =====================================================
-- Fecha: 2025-12-16
-- Descripción: Agrega columnas nuevas necesarias para el formulario de software
-- incluyendo SSL expiry date, production_url, staging_url, etc.

-- Agregar columnas faltantes
ALTER TABLE custom_applications 
  ADD COLUMN IF NOT EXISTS production_url TEXT,
  ADD COLUMN IF NOT EXISTS staging_url TEXT,
  ADD COLUMN IF NOT EXISTS development_url TEXT,
  ADD COLUMN IF NOT EXISTS mobile_tech TEXT,
  ADD COLUMN IF NOT EXISTS ssl_certificate TEXT,
  ADD COLUMN IF NOT EXISTS cdn_provider TEXT;

-- Comentarios descriptivos
COMMENT ON COLUMN custom_applications.production_url IS 'URL del ambiente de producción';
COMMENT ON COLUMN custom_applications.staging_url IS 'URL del ambiente de staging/pruebas';
COMMENT ON COLUMN custom_applications.development_url IS 'URL del ambiente de desarrollo';
COMMENT ON COLUMN custom_applications.mobile_tech IS 'Tecnologías móviles (React Native, Flutter, etc.)';
COMMENT ON COLUMN custom_applications.ssl_certificate IS 'Proveedor del certificado SSL (Let''s Encrypt, Cloudflare, etc.)';
COMMENT ON COLUMN custom_applications.ssl_expiry_date IS 'Fecha de vencimiento del certificado SSL';
COMMENT ON COLUMN custom_applications.cdn_provider IS 'Proveedor de CDN (Cloudflare, CloudFront, etc.)';

-- Crear índice para alertas de SSL próximo a vencer
CREATE INDEX IF NOT EXISTS idx_custom_applications_ssl_expiry 
ON custom_applications(ssl_expiry_date) 
WHERE ssl_expiry_date IS NOT NULL;
