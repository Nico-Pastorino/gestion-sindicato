-- ============================================================
-- MIGRACIÓN 003: Soporte de pagos automáticos en installments
-- ============================================================

-- auto_paid: true si la cuota fue marcada pagada por el cron automático
ALTER TABLE installments
  ADD COLUMN IF NOT EXISTS auto_paid BOOLEAN NOT NULL DEFAULT false;

-- paid_by: quién marcó el pago ('system', 'admin', 'operator')
ALTER TABLE installments
  ADD COLUMN IF NOT EXISTS paid_by TEXT;

-- Constraint: paid_by solo acepta valores válidos cuando existe
ALTER TABLE installments
  DROP CONSTRAINT IF EXISTS "installments_paid_by_check";
ALTER TABLE installments
  ADD CONSTRAINT "installments_paid_by_check"
    CHECK (paid_by IS NULL OR paid_by IN ('system', 'admin', 'operator'));

-- Índice para el cron: cuotas pendientes con due_date vencida
CREATE INDEX IF NOT EXISTS "installments_cron_idx"
  ON installments (status, due_date)
  WHERE status IN ('pending', 'overdue');
