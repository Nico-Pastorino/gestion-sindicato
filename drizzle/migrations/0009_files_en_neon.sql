-- Migration 0009: los archivos de afiliados se guardan en la propia base
-- (Neon) en vez de Vercel Blob. Solo agrega la columna binaria.

ALTER TABLE affiliate_files
  ADD COLUMN IF NOT EXISTS data BYTEA;
