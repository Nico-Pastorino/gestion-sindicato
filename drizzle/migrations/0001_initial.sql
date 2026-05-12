-- ============================================================
-- MIGRACIÓN 001: Estructura inicial del sistema sindical
-- Compatible con Neon PostgreSQL
-- ============================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── TABLA: users ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "users" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "role"          TEXT NOT NULL DEFAULT 'operator'
                    CHECK (role IN ('admin', 'operator', 'readonly')),
  "password_hash" TEXT,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "users_email_unique" UNIQUE ("email")
);

-- ─── TABLA: affiliates ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "affiliates" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "full_name"    TEXT NOT NULL,
  "dni"          TEXT NOT NULL,
  "legajo"       TEXT,
  "area"         TEXT,
  "gross_salary" NUMERIC(14, 2) NOT NULL DEFAULT 0
                   CHECK (gross_salary >= 0),
  "phone"        TEXT,
  "status"       TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive')),
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "affiliates_dni_unique"    UNIQUE ("dni"),
  CONSTRAINT "affiliates_legajo_unique" UNIQUE ("legajo")
);

CREATE INDEX IF NOT EXISTS "affiliates_full_name_idx" ON "affiliates" ("full_name");
CREATE INDEX IF NOT EXISTS "affiliates_status_idx"    ON "affiliates" ("status");

-- ─── TABLA: benefits ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "benefits" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "affiliate_id"        UUID NOT NULL REFERENCES "affiliates"("id") ON DELETE RESTRICT,
  "date"                DATE NOT NULL,
  "type"                TEXT NOT NULL
                          CHECK (type IN ('ayuda_economica', 'supermercado', 'otro')),
  "commerce"            TEXT,
  "total_amount"        NUMERIC(14, 2) NOT NULL
                          CHECK (total_amount > 0),
  "installments_count"  INTEGER NOT NULL DEFAULT 1
                          CHECK (installments_count BETWEEN 1 AND 3),
  "installment_amount"  NUMERIC(14, 2) NOT NULL
                          CHECK (installment_amount > 0),
  "status"              TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'cancelled', 'finished')),
  "observations"        TEXT,
  "created_by"          UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Supermercado: solo 1 cuota
  CONSTRAINT "benefits_supermercado_one_installment"
    CHECK (type != 'supermercado' OR installments_count = 1),
  -- Cuota calculada correctamente (con tolerancia de 1 centavo por redondeo)
  CONSTRAINT "benefits_installment_amount_valid"
    CHECK (ABS(installment_amount - (total_amount / installments_count)) <= 0.01)
);

CREATE INDEX IF NOT EXISTS "benefits_affiliate_id_idx" ON "benefits" ("affiliate_id");
CREATE INDEX IF NOT EXISTS "benefits_status_idx"       ON "benefits" ("status");
CREATE INDEX IF NOT EXISTS "benefits_type_idx"         ON "benefits" ("type");
CREATE INDEX IF NOT EXISTS "benefits_date_idx"         ON "benefits" ("date");

-- ─── TABLA: installments ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "installments" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "benefit_id"          UUID NOT NULL REFERENCES "benefits"("id") ON DELETE RESTRICT,
  "affiliate_id"        UUID NOT NULL REFERENCES "affiliates"("id") ON DELETE RESTRICT,
  "installment_number"  INTEGER NOT NULL CHECK (installment_number >= 1),
  "total_installments"  INTEGER NOT NULL CHECK (total_installments >= 1),
  "due_date"            DATE NOT NULL,
  "paid_date"           DATE,
  "amount"              NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  "status"              TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Si está pagada, debe tener fecha de pago
  CONSTRAINT "installments_paid_requires_date"
    CHECK (status != 'paid' OR paid_date IS NOT NULL),
  -- Una sola cuota por número dentro de un beneficio
  CONSTRAINT "installments_unique_number_per_benefit"
    UNIQUE ("benefit_id", "installment_number")
);

CREATE INDEX IF NOT EXISTS "installments_affiliate_id_idx"     ON "installments" ("affiliate_id");
CREATE INDEX IF NOT EXISTS "installments_benefit_id_idx"       ON "installments" ("benefit_id");
CREATE INDEX IF NOT EXISTS "installments_status_idx"           ON "installments" ("status");
CREATE INDEX IF NOT EXISTS "installments_due_date_idx"         ON "installments" ("due_date");
CREATE INDEX IF NOT EXISTS "installments_affiliate_status_idx" ON "installments" ("affiliate_id", "status");

-- ─── TABLA: audit_logs ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "action"      TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id"   UUID,
  "old_value"   JSONB,
  "new_value"   JSONB,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx"     ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx"    ON "audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx"     ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");

-- ─── TABLA: whatsapp_alerts ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "whatsapp_alerts" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"            TEXT NOT NULL,
  "recipient_phone" TEXT NOT NULL,
  "message"         TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  "payload"         JSONB,
  "sent_at"         TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "whatsapp_alerts_status_idx" ON "whatsapp_alerts" ("status");
CREATE INDEX IF NOT EXISTS "whatsapp_alerts_type_idx"   ON "whatsapp_alerts" ("type");

-- ─── TABLA: settings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "settings" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key"        TEXT NOT NULL,
  "value"      JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "settings_key_unique" UNIQUE ("key")
);

-- ─── TRIGGER: updated_at automático ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "users_updated_at"
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER "affiliates_updated_at"
  BEFORE UPDATE ON "affiliates"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER "benefits_updated_at"
  BEFORE UPDATE ON "benefits"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER "installments_updated_at"
  BEFORE UPDATE ON "installments"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER "settings_updated_at"
  BEFORE UPDATE ON "settings"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── VISTA: affiliate_credit_summary ─────────────────────────────────────────
-- Vista central que calcula el disponible del afiliado en tiempo real.
-- Nunca se guarda como campo editable; siempre se calcula desde aquí.

CREATE OR REPLACE VIEW "affiliate_credit_summary" AS
SELECT
  a.id                                            AS affiliate_id,
  a.full_name,
  a.dni,
  a.legajo,
  a.area,
  a.status,
  a.gross_salary,
  ROUND(a.gross_salary * 0.30, 2)                 AS credit_limit_30,
  COALESCE(
    SUM(i.amount) FILTER (WHERE i.status IN ('pending', 'overdue')),
    0
  )                                               AS active_discounts,
  ROUND(
    (a.gross_salary * 0.30) - COALESCE(
      SUM(i.amount) FILTER (WHERE i.status IN ('pending', 'overdue')),
      0
    ),
    2
  )                                               AS available_amount
FROM "affiliates" a
LEFT JOIN "installments" i ON i.affiliate_id = a.id
GROUP BY
  a.id,
  a.full_name,
  a.dni,
  a.legajo,
  a.area,
  a.status,
  a.gross_salary;

-- ─── FUNCIÓN: check_credit_available ─────────────────────────────────────────
-- Verifica si un afiliado tiene disponible antes de crear un beneficio.
-- Devuelve TRUE si el monto de cuota cabe dentro del disponible.

CREATE OR REPLACE FUNCTION check_credit_available(
  p_affiliate_id UUID,
  p_installment_amount NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  v_available NUMERIC;
BEGIN
  SELECT available_amount
  INTO v_available
  FROM affiliate_credit_summary
  WHERE affiliate_id = p_affiliate_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN p_installment_amount <= v_available;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── DATOS INICIALES: settings por defecto ────────────────────────────────────

INSERT INTO "settings" ("key", "value") VALUES
  ('credit_limit_percentage', '0.30'),
  ('max_installments_ayuda_economica', '3'),
  ('max_installments_supermercado', '1'),
  ('app_name', '"Sistema de Gestión Sindical"')
ON CONFLICT ("key") DO NOTHING;
