-- Migration 0005: tabla de historial de exportaciones
CREATE TABLE IF NOT EXISTS export_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT NOT NULL DEFAULT 'municipality',
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  file_name        TEXT,
  records_count    INTEGER NOT NULL DEFAULT 0,
  benefits_count   INTEGER NOT NULL DEFAULT 0,
  total_principal  NUMERIC(16,2) NOT NULL DEFAULT 0,
  total_installment NUMERIC(16,2) NOT NULL DEFAULT 0,
  total_interest   NUMERIC(16,2) NOT NULL DEFAULT 0,
  sent_by_email    BOOLEAN NOT NULL DEFAULT false,
  email_to         TEXT,
  email_cc         TEXT,
  sent_by_whatsapp BOOLEAN NOT NULL DEFAULT false,
  whatsapp_to      TEXT,
  status           TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','sent','failed')),
  error_message    TEXT,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at          TIMESTAMPTZ
);

CREATE INDEX export_logs_period_idx ON export_logs (period_start, period_end);
CREATE INDEX export_logs_status_idx ON export_logs (status);
CREATE INDEX export_logs_created_at_idx ON export_logs (created_at DESC);
