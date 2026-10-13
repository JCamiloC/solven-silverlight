-- Log de digests de alertas enviados a soporte (correo semanal / diario vencidos)

CREATE TABLE IF NOT EXISTS public.alert_digest_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_type TEXT NOT NULL CHECK (digest_type IN ('weekly_upcoming', 'daily_expired')),
  item_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_digest_log_type_sent
  ON public.alert_digest_log (digest_type, sent_at DESC);

COMMENT ON TABLE public.alert_digest_log IS 'Registro de envíos de digest de vencimientos a soporte@silverlight.com.co';

ALTER TABLE public.alert_digest_log ENABLE ROW LEVEL SECURITY;

-- Solo service role / backend (sin políticas para authenticated)
