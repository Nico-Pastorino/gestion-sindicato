-- Migration 0007: campos comerciales, perfil laboral normalizado y métricas ejecutivas.

ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE;

ALTER TABLE affiliates
  DROP CONSTRAINT IF EXISTS affiliates_sex_check,
  DROP CONSTRAINT IF EXISTS affiliates_employment_type_check;

UPDATE affiliates
SET employment_type = CASE employment_type
  WHEN 'planta' THEN 'planta_permanente'
  WHEN 'contratado' THEN 'planta_temporaria'
  WHEN 'jubilado' THEN 'jubilado'
  ELSE NULL
END
WHERE employment_type IS NOT NULL
  AND employment_type NOT IN ('planta_permanente', 'planta_temporaria', 'jubilado');

ALTER TABLE affiliates
  ADD CONSTRAINT affiliates_sex_check
    CHECK (sex IS NULL OR sex IN ('masculino', 'femenino', 'otro', 'prefiero_no_responder')),
  ADD CONSTRAINT affiliates_employment_type_check
    CHECK (employment_type IS NULL OR employment_type IN ('planta_permanente', 'planta_temporaria', 'jubilado'));

CREATE INDEX IF NOT EXISTS affiliates_sex_idx ON affiliates (sex);
CREATE INDEX IF NOT EXISTS affiliates_employment_type_idx ON affiliates (employment_type);
CREATE INDEX IF NOT EXISTS affiliates_hire_date_idx ON affiliates (hire_date);

ALTER TABLE benefits
  ADD COLUMN IF NOT EXISTS commerce_retention_rate NUMERIC(8, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS union_profit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

UPDATE benefits
SET union_profit_amount = interest_amount
WHERE union_profit_amount = 0 AND interest_amount > 0;

ALTER TABLE benefits
  DROP CONSTRAINT IF EXISTS benefits_commerce_retention_rate_check,
  DROP CONSTRAINT IF EXISTS benefits_union_profit_amount_check,
  ADD CONSTRAINT benefits_commerce_retention_rate_check
    CHECK (commerce_retention_rate >= 0 AND commerce_retention_rate <= 100),
  ADD CONSTRAINT benefits_union_profit_amount_check
    CHECK (union_profit_amount >= 0);

CREATE INDEX IF NOT EXISTS benefits_commerce_idx ON benefits (commerce);
CREATE INDEX IF NOT EXISTS benefits_union_profit_amount_idx ON benefits (union_profit_amount);
