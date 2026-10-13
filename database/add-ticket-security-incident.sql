-- Marca tickets que cuentan como incidente de seguridad (metrica KPI Seguridad)
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS security_incident BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tickets.security_incident IS 'Si es true, el ticket se incluye en la metrica de seguridad del reporte KPI';
