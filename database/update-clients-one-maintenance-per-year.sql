-- Actualizar clientes a 1 mantenimiento al año (ejecutar en Supabase SQL Editor)
-- Ajusta mantenimientos_al_anio y limpia slots extra no realizados en 2025-2026.

BEGIN;

UPDATE public.clients
SET mantenimientos_al_anio = 1,
    updated_at = NOW()
WHERE id IN (
  '3b4eb81a-2020-4f1a-8f59-093995730a70', -- Ingenieria y Gases ltda - Ingegas
  '7033184c-9e5d-4e50-b8cf-b91c026e045f', -- Medellín y Duran Abogados SAS
  '2ca052e8-2d04-4ab9-8f23-1bc9365c6ada', -- Ingenieria, construcciones y diseños C&D
  '0745962e-0dc2-4957-b4e2-f882842b0628', -- Corporación Punto Azul
  '79b0998f-d881-4d5a-bb52-dab5c7e440a0', -- US Biosolutions ltda
  '8f2759b8-f41f-4126-aaa1-9973415e1652', -- Vigilancia y Seguridad Cronos ltda
  '86d0d5af-9e37-448c-a05a-f63c47b4b9e4', -- Dimetales S.A.S
  'f5a39d43-8f4d-49dd-8f1d-f51beed2c1c4', -- Compañía Colombiana de Lavado ltda
  'cd0aed4a-6abf-4582-81ae-0ba8f96c4c66', -- Grupo AGO SAS
  'b89f6a81-2eb6-4f0b-8545-2388383975dc', -- Inversiones Transsabana SAS
  '608de375-b001-462d-ac17-4eed51ae2b54', -- Metricom Limitada
  '557dab4f-6680-4c9e-8a6a-4db4e532e7a7', -- Rockit Cargo S.A.S
  '40518078-8d73-434d-a702-15293178a414', -- Silverlight Colombia
  '65feee21-43ba-4772-9164-81e29733591f', -- Transportes Bahiaclass
  '667a4a5d-531b-4e26-9b8d-dd91d195af0e'  -- Transportes Fontibon S.A
);

-- Eliminar slots pendientes/reprogramados/omitidos por encima del slot 1 (conserva realizados)
DELETE FROM public.client_maintenance_schedule cms
USING public.clients c
WHERE cms.client_id = c.id
  AND c.mantenimientos_al_anio = 1
  AND cms.year IN (2025, 2026)
  AND cms.slot_number > 1
  AND cms.status <> 'realizado'
  AND c.id IN (
    '3b4eb81a-2020-4f1a-8f59-093995730a70',
    '7033184c-9e5d-4e50-b8cf-b91c026e045f',
    '2ca052e8-2d04-4ab9-8f23-1bc9365c6ada',
    '0745962e-0dc2-4957-b4e2-f882842b0628',
    '79b0998f-d881-4d5a-bb52-dab5c7e440a0',
    '8f2759b8-f41f-4126-aaa1-9973415e1652',
    '86d0d5af-9e37-448c-a05a-f63c47b4b9e4',
    'f5a39d43-8f4d-49dd-8f1d-f51beed2c1c4',
    'cd0aed4a-6abf-4582-81ae-0ba8f96c4c66',
    'b89f6a81-2eb6-4f0b-8545-2388383975dc',
    '608de375-b001-462d-ac17-4eed51ae2b54',
    '557dab4f-6680-4c9e-8a6a-4db4e532e7a7',
    '40518078-8d73-434d-a702-15293178a414',
    '65feee21-43ba-4772-9164-81e29733591f',
    '667a4a5d-531b-4e26-9b8d-dd91d195af0e'
  );

-- Crear slot 1 si falta (15 junio del año)
INSERT INTO public.client_maintenance_schedule (client_id, year, slot_number, expected_date, status)
SELECT c.id, y.year, 1, make_date(y.year, 6, 15), 'pendiente'
FROM public.clients c
CROSS JOIN (VALUES (2025), (2026)) AS y(year)
WHERE c.id IN (
  '3b4eb81a-2020-4f1a-8f59-093995730a70',
  '7033184c-9e5d-4e50-b8cf-b91c026e045f',
  '2ca052e8-2d04-4ab9-8f23-1bc9365c6ada',
  '0745962e-0dc2-4957-b4e2-f882842b0628',
  '79b0998f-d881-4d5a-bb52-dab5c7e440a0',
  '8f2759b8-f41f-4126-aaa1-9973415e1652',
  '86d0d5af-9e37-448c-a05a-f63c47b4b9e4',
  'f5a39d43-8f4d-49dd-8f1d-f51beed2c1c4',
  'cd0aed4a-6abf-4582-81ae-0ba8f96c4c66',
  'b89f6a81-2eb6-4f0b-8545-2388383975dc',
  '608de375-b001-462d-ac17-4eed51ae2b54',
  '557dab4f-6680-4c9e-8a6a-4db4e532e7a7',
  '40518078-8d73-434d-a702-15293178a414',
  '65feee21-43ba-4772-9164-81e29733591f',
  '667a4a5d-531b-4e26-9b8d-dd91d195af0e'
)
ON CONFLICT (client_id, year, slot_number) DO NOTHING;

COMMIT;
