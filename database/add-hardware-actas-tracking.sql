-- Campos de seguimiento de envío y firma de actas de hardware
ALTER TABLE public.hardware_actas
  ADD COLUMN IF NOT EXISTS enviado_a text,
  ADD COLUMN IF NOT EXISTS enviado_en timestamptz,
  ADD COLUMN IF NOT EXISTS staff_notify_email text,
  ADD COLUMN IF NOT EXISTS firmado_en timestamptz;

COMMENT ON COLUMN public.hardware_actas.enviado_a IS 'Correo al que se envió el link de firma al cliente';
COMMENT ON COLUMN public.hardware_actas.enviado_en IS 'Fecha/hora del envío del link de firma';
COMMENT ON COLUMN public.hardware_actas.staff_notify_email IS 'Correo del técnico/solven a notificar cuando el cliente firme';
COMMENT ON COLUMN public.hardware_actas.firmado_en IS 'Fecha/hora en que el cliente firmó el acta';

UPDATE public.hardware_actas
SET estado_firma = 'falta_cliente'
WHERE estado_firma = 'pendiente'
  AND generador_firma_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hardware_actas_hardware_asset_id ON public.hardware_actas (hardware_asset_id);
CREATE INDEX IF NOT EXISTS idx_hardware_actas_estado_firma ON public.hardware_actas (estado_firma);
CREATE INDEX IF NOT EXISTS idx_hardware_actas_link_temporal ON public.hardware_actas (link_temporal);
