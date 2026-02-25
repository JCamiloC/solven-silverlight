-- =====================================================
-- FIRMA CORPORATIVA DEL CLIENTE PARA ACTAS
-- =====================================================

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS acta_generador_nombre TEXT,
ADD COLUMN IF NOT EXISTS acta_generador_cedula TEXT,
ADD COLUMN IF NOT EXISTS acta_generador_firma_url TEXT,
ADD COLUMN IF NOT EXISTS acta_generador_actualizado_en TIMESTAMPTZ;

COMMENT ON COLUMN public.clients.acta_generador_nombre IS 'Nombre de quien entrega por parte de la empresa (firma corporativa para actas)';
COMMENT ON COLUMN public.clients.acta_generador_cedula IS 'Cédula de quien entrega por parte de la empresa';
COMMENT ON COLUMN public.clients.acta_generador_firma_url IS 'URL pública de la firma del generador para actas';
COMMENT ON COLUMN public.clients.acta_generador_actualizado_en IS 'Fecha de última actualización de la firma corporativa para actas';
