-- Migration 0004: gross_salary pasa a ser opcional (nullable)
-- Motivo: permitir cargar afiliados sin salario bruto conocido.
-- La validación del tope 30% sigue bloqueando la creación de beneficios si no hay salario.

ALTER TABLE affiliates ALTER COLUMN gross_salary DROP NOT NULL;
ALTER TABLE affiliates ALTER COLUMN gross_salary DROP DEFAULT;

-- Filas con valor '0' que nunca fueron editadas se marcan como NULL
-- (indica "sin salario cargado" vs "salario cero real")
UPDATE affiliates SET gross_salary = NULL WHERE gross_salary = '0';
