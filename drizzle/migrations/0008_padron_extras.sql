-- Migration 0008: archivos por afiliado, grupo familiar, recordatorios,
-- novedades, foto de perfil y motivo de baja. Solo cambios aditivos.

ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS inactive_reason TEXT,
  ADD COLUMN IF NOT EXISTS inactive_date DATE;

ALTER TABLE affiliates
  DROP CONSTRAINT IF EXISTS affiliates_inactive_reason_check,
  ADD CONSTRAINT affiliates_inactive_reason_check
    CHECK (inactive_reason IS NULL OR inactive_reason IN ('renuncia', 'jubilacion', 'fallecimiento', 'traslado', 'otro'));

CREATE TABLE IF NOT EXISTS affiliate_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'otro'
    CHECK (kind IN ('foto', 'dni', 'ficha_firmada', 'certificado', 'otro')),
  url TEXT NOT NULL,
  pathname TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_files_affiliate_id_idx ON affiliate_files (affiliate_id);
CREATE INDEX IF NOT EXISTS affiliate_files_kind_idx ON affiliate_files (kind);

CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'hijo_a'
    CHECK (relationship IN ('conyuge', 'concubino_a', 'hijo_a', 'otro')),
  dni TEXT,
  birth_date DATE,
  student_certificate BOOLEAN NOT NULL DEFAULT FALSE,
  student_certificate_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS family_members_affiliate_id_idx ON family_members (affiliate_id);
CREATE INDEX IF NOT EXISTS family_members_student_certificate_idx ON family_members (student_certificate);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  done_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reminders_status_idx ON reminders (status);
CREATE INDEX IF NOT EXISTS reminders_due_date_idx ON reminders (due_date);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_active_idx ON announcements (active);
