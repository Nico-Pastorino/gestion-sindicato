-- Migration 0006: ficha interna ampliada de afiliados
-- Todos los campos son opcionales salvo documentation_status para no romper afiliados existentes.

ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT CHECK (employment_type IN ('planta', 'contratado', 'jubilado', 'otro')),
  ADD COLUMN IF NOT EXISTS work_shift TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE,
  ADD COLUMN IF NOT EXISTS affiliation_date DATE,
  ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS cuil TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS documentation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (documentation_status IN ('complete', 'pending', 'missing')),
  ADD COLUMN IF NOT EXISTS private_notes TEXT;

CREATE INDEX IF NOT EXISTS affiliates_email_idx ON affiliates (email);
CREATE INDEX IF NOT EXISTS affiliates_cuil_idx ON affiliates (cuil);
CREATE INDEX IF NOT EXISTS affiliates_documentation_status_idx ON affiliates (documentation_status);
