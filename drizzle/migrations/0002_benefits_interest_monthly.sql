-- ============================================================
-- MIGRACIÓN 002: Soporte de cuotas con interés + validación mensual
-- ============================================================

-- ─── 1. Eliminar constraint que prohibía interés ──────────────────────────────
-- Este constraint asumía que cuota = capital / cuotas, lo cual no admite interés.
ALTER TABLE benefits DROP CONSTRAINT IF EXISTS "benefits_installment_amount_valid";

-- ─── 2. Agregar columnas de interés en benefits ───────────────────────────────

ALTER TABLE benefits
  ADD COLUMN IF NOT EXISTS total_repayment_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS interest_amount        NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interest_rate          NUMERIC(8,4)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_due_date         DATE;

-- Retrocompatibilidad: llenar columnas nuevas con datos existentes
UPDATE benefits
SET
  total_repayment_amount = ROUND(installment_amount * installments_count, 2),
  interest_amount        = GREATEST(ROUND((installment_amount * installments_count) - total_amount, 2), 0),
  interest_rate          = CASE
    WHEN total_amount > 0
    THEN ROUND(((installment_amount * installments_count - total_amount) / total_amount * 100)::NUMERIC, 4)
    ELSE 0
  END
WHERE total_repayment_amount IS NULL;

-- Hacer NOT NULL después del backfill
ALTER TABLE benefits
  ALTER COLUMN total_repayment_amount SET NOT NULL,
  ALTER COLUMN interest_amount        SET NOT NULL,
  ALTER COLUMN interest_rate          SET NOT NULL;

-- ─── 3. Constraint positivo: cuota >= capital/cuotas (no puede ser menor) ─────
-- Permite interés, pero no permite descuentos arbitrarios.
ALTER TABLE benefits DROP CONSTRAINT IF EXISTS "benefits_installment_ge_base";
ALTER TABLE benefits ADD CONSTRAINT "benefits_installment_ge_base"
  CHECK (installment_amount >= ROUND(total_amount / installments_count::NUMERIC, 2) - 0.01);

-- ─── 4. Índice para la query mensual de disponible ────────────────────────────
CREATE INDEX IF NOT EXISTS "installments_due_date_month_idx"
  ON installments (affiliate_id, date_trunc('month', due_date::TIMESTAMPTZ), status);

-- ─── 5. Vista de disponible mensual por afiliado ─────────────────────────────
-- Usada para validación antes de crear un beneficio.
-- No reemplaza affiliate_credit_summary; la complementa con granularidad mensual.
CREATE OR REPLACE VIEW affiliate_monthly_discounts AS
SELECT
  i.affiliate_id,
  DATE_TRUNC('month', i.due_date)::DATE                           AS month,
  COALESCE(SUM(i.amount) FILTER (WHERE i.status IN ('pending','overdue')), 0) AS monthly_discounts
FROM installments i
GROUP BY i.affiliate_id, DATE_TRUNC('month', i.due_date)::DATE;

-- ─── 6. Recrear vista general con campos nuevos ───────────────────────────────
CREATE OR REPLACE VIEW affiliate_credit_summary AS
SELECT
  a.id                                                                  AS affiliate_id,
  a.full_name,
  a.dni,
  a.legajo,
  a.area,
  a.status,
  a.gross_salary,
  ROUND(a.gross_salary * 0.30, 2)                                      AS credit_limit_30,
  COALESCE(
    SUM(i.amount) FILTER (WHERE i.status IN ('pending', 'overdue')),
    0
  )                                                                     AS active_discounts,
  ROUND(
    (a.gross_salary * 0.30) - COALESCE(
      SUM(i.amount) FILTER (WHERE i.status IN ('pending', 'overdue')),
      0
    ),
    2
  )                                                                     AS available_amount
FROM affiliates a
LEFT JOIN installments i ON i.affiliate_id = a.id
GROUP BY a.id, a.full_name, a.dni, a.legajo, a.area, a.status, a.gross_salary;

-- ─── 7. Función de validación mensual acumulativa ────────────────────────────
-- Verifica si las cuotas de un nuevo beneficio caben en el 30% de cada mes.
-- Retorna JSONB con los meses en conflicto (vacío = OK).
CREATE OR REPLACE FUNCTION validate_monthly_credit(
  p_affiliate_id     UUID,
  p_installment_amount NUMERIC,
  p_installments_count INTEGER,
  p_first_due_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_gross_salary   NUMERIC;
  v_credit_limit   NUMERIC;
  v_month_start    DATE;
  v_month_end      DATE;
  v_existing       NUMERIC;
  v_projected      NUMERIC;
  v_conflicts      JSONB := '[]'::JSONB;
  i                INTEGER;
BEGIN
  SELECT gross_salary INTO v_gross_salary
  FROM affiliates WHERE id = p_affiliate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Afiliado no encontrado: %', p_affiliate_id;
  END IF;

  v_credit_limit := ROUND(v_gross_salary * 0.30, 2);

  FOR i IN 0..(p_installments_count - 1) LOOP
    v_month_start := DATE_TRUNC('month', p_first_due_date + (i || ' months')::INTERVAL)::DATE;
    v_month_end   := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    SELECT COALESCE(SUM(amount), 0) INTO v_existing
    FROM installments
    WHERE affiliate_id = p_affiliate_id
      AND status IN ('pending', 'overdue')
      AND due_date BETWEEN v_month_start AND v_month_end;

    v_projected := ROUND(v_existing + p_installment_amount, 2);

    IF v_projected > v_credit_limit THEN
      v_conflicts := v_conflicts || jsonb_build_object(
        'month',          TO_CHAR(v_month_start, 'YYYY-MM'),
        'monthLabel',     TO_CHAR(v_month_start, 'TMMonth YYYY'),
        'creditLimit30',  v_credit_limit,
        'activeDiscounts', v_existing,
        'newInstallment', p_installment_amount,
        'projectedTotal', v_projected,
        'excess',         ROUND(v_projected - v_credit_limit, 2)
      );
    END IF;
  END LOOP;

  RETURN v_conflicts;
END;
$$;
