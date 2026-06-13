-- Conciliación mensual: motivo de no cobro
-- Cuando una cuota auto-cobrada por el cron se revierte porque la municipalidad
-- no la retuvo, se guarda el motivo (licencia, renuncia, error municipal, etc.)
-- y el momento de la reversión. Columnas aditivas y nullables: seguro de aplicar
-- en caliente sobre la base existente.

ALTER TABLE installments ADD COLUMN IF NOT EXISTS uncollected_reason text;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS uncollected_at timestamptz;
