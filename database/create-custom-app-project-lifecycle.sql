-- =====================================================
-- Custom Applications: Project Lifecycle Extension
-- Ejecutar manualmente en Supabase SQL Editor
-- =====================================================

-- 1) Fases del proyecto
CREATE TABLE IF NOT EXISTS software_project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES custom_applications(id) ON DELETE CASCADE,
  phase_key TEXT NOT NULL CHECK (phase_key IN (
    'discovery',
    'drp',
    'analisis',
    'desarrollo',
    'qa',
    'uat',
    'produccion',
    'posventa'
  )),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente',
    'en_progreso',
    'bloqueada',
    'completada'
  )),
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(application_id, phase_key)
);

CREATE INDEX IF NOT EXISTS idx_software_project_phases_application_id
  ON software_project_phases(application_id);

-- 2) Documentación del proyecto
CREATE TABLE IF NOT EXISTS software_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES custom_applications(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'drp',
    'caso_uso',
    'modelo_bd',
    'acta_reunion',
    'entrega_produccion',
    'manual',
    'otro'
  )),
  title TEXT NOT NULL,
  version TEXT,
  storage_url TEXT,
  summary TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_software_documents_application_id
  ON software_documents(application_id);

-- 3) Reuniones del proyecto
CREATE TABLE IF NOT EXISTS software_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES custom_applications(id) ON DELETE CASCADE,
  meeting_date TIMESTAMPTZ NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'seguimiento' CHECK (meeting_type IN (
    'kickoff',
    'seguimiento',
    'planeacion',
    'qa',
    'entrega',
    'postventa',
    'otro'
  )),
  attendees TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT,
  notes TEXT,
  next_meeting_date TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_software_meetings_application_id
  ON software_meetings(application_id);

-- 4) Ítems de reunión (pendientes, acuerdos, riesgos)
CREATE TABLE IF NOT EXISTS software_meeting_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES software_meetings(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES custom_applications(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('pendiente', 'acuerdo', 'riesgo')),
  description TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente',
    'en_progreso',
    'resuelto',
    'cerrado'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_software_meeting_items_application_id
  ON software_meeting_items(application_id);

CREATE INDEX IF NOT EXISTS idx_software_meeting_items_meeting_id
  ON software_meeting_items(meeting_id);

-- 5) Releases / salidas
CREATE TABLE IF NOT EXISTS software_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES custom_applications(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('staging', 'produccion')),
  release_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'planeada' CHECK (status IN (
    'planeada',
    'ejecutada',
    'fallida',
    'rollback'
  )),
  changelog TEXT,
  delivery_document_url TEXT,
  delivered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_software_releases_application_id
  ON software_releases(application_id);

-- 6) Posventa (ajustes menores)
CREATE TABLE IF NOT EXISTS software_postsale_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES custom_applications(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  detail TEXT,
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'critica')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente',
    'en_progreso',
    'resuelto',
    'cancelado'
  )),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_software_postsale_adjustments_application_id
  ON software_postsale_adjustments(application_id);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE software_project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_meeting_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_postsale_adjustments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'software_project_phases' AND policyname = 'software_project_phases_authenticated_all'
  ) THEN
    CREATE POLICY software_project_phases_authenticated_all
      ON software_project_phases
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'software_documents' AND policyname = 'software_documents_authenticated_all'
  ) THEN
    CREATE POLICY software_documents_authenticated_all
      ON software_documents
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'software_meetings' AND policyname = 'software_meetings_authenticated_all'
  ) THEN
    CREATE POLICY software_meetings_authenticated_all
      ON software_meetings
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'software_meeting_items' AND policyname = 'software_meeting_items_authenticated_all'
  ) THEN
    CREATE POLICY software_meeting_items_authenticated_all
      ON software_meeting_items
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'software_releases' AND policyname = 'software_releases_authenticated_all'
  ) THEN
    CREATE POLICY software_releases_authenticated_all
      ON software_releases
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'software_postsale_adjustments' AND policyname = 'software_postsale_adjustments_authenticated_all'
  ) THEN
    CREATE POLICY software_postsale_adjustments_authenticated_all
      ON software_postsale_adjustments
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- Seed inicial de fases para apps existentes
-- =====================================================
INSERT INTO software_project_phases (application_id, phase_key, title, sort_order)
SELECT ca.id, seed.phase_key, seed.title, seed.sort_order
FROM custom_applications ca
CROSS JOIN (
  VALUES
    ('discovery', 'Descubrimiento', 10),
    ('drp', 'DRP y alcance', 20),
    ('analisis', 'Análisis funcional y técnico', 30),
    ('desarrollo', 'Desarrollo', 40),
    ('qa', 'Pruebas QA', 50),
    ('uat', 'Validación UAT', 60),
    ('produccion', 'Salida a producción', 70),
    ('posventa', 'Posventa y ajustes', 80)
) AS seed(phase_key, title, sort_order)
ON CONFLICT (application_id, phase_key) DO NOTHING;
