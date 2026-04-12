-- Orden manual de filas en preregistros (misma secuencia que en Nueva venta).
-- Ejecutar en Supabase SQL Editor. Idempotente: solo asigna orden donde sea NULL.

ALTER TABLE preregistros_minorista
  ADD COLUMN IF NOT EXISTS orden INTEGER;

ALTER TABLE preregistros_mayorista
  ADD COLUMN IF NOT EXISTS orden INTEGER;

UPDATE preregistros_minorista p
SET orden = ranked.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY id_minorista ORDER BY created_at ASC) AS rn
  FROM preregistros_minorista
) ranked
WHERE p.id = ranked.id AND p.orden IS NULL;

UPDATE preregistros_mayorista p
SET orden = ranked.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY id_mayorista ORDER BY created_at ASC) AS rn
  FROM preregistros_mayorista
) ranked
WHERE p.id = ranked.id AND p.orden IS NULL;

COMMENT ON COLUMN preregistros_minorista.orden IS 'Orden de visualización (menor = arriba); editable desde admin';
COMMENT ON COLUMN preregistros_mayorista.orden IS 'Orden de visualización (menor = arriba); editable desde admin';
