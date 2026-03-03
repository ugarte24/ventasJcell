-- ============================================================================
-- ACTUALIZAR ESTRUCTURA DE PREREGISTROS_MAYORISTA
-- ============================================================================
-- Objetivo: Hacer que los preregistros de mayorista sean reutilizables como los de minorista
-- Cambios:
-- 1. Consolidar registros duplicados (un registro por mayorista+producto)
-- 2. Eliminar columna fecha (los preregistros son reutilizables todos los días)
-- 3. Actualizar constraint UNIQUE a (id_mayorista, id_producto)
-- ============================================================================

-- Paso 1: Consolidar registros duplicados (mantener uno por id_mayorista, id_producto)
-- Conservamos el registro con la fecha más reciente; si hay empate, el más reciente por created_at
WITH duplicados AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY id_mayorista, id_producto
      ORDER BY fecha DESC NULLS LAST, created_at DESC
    ) AS rn
  FROM preregistros_mayorista
)
DELETE FROM preregistros_mayorista
WHERE id IN (SELECT id FROM duplicados WHERE rn > 1);

-- Paso 2: Eliminar constraint(s) UNIQUE existente(s)
DO $$
DECLARE
  conname text;
BEGIN
  FOR conname IN
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'preregistros_mayorista' AND constraint_type = 'UNIQUE'
  LOOP
    EXECUTE format('ALTER TABLE preregistros_mayorista DROP CONSTRAINT IF EXISTS %I', conname);
  END LOOP;
END $$;

-- Paso 3: Eliminar índices relacionados con fecha
DROP INDEX IF EXISTS idx_preregistros_mayorista_fecha;
DROP INDEX IF EXISTS idx_preregistros_mayorista_mayorista_fecha;

-- Paso 4: Eliminar columna fecha
ALTER TABLE preregistros_mayorista DROP COLUMN IF EXISTS fecha;

-- Paso 5: Crear nuevo constraint UNIQUE (id_mayorista, id_producto)
ALTER TABLE preregistros_mayorista
  ADD CONSTRAINT preregistros_mayorista_id_mayorista_id_producto_key
  UNIQUE(id_mayorista, id_producto);

-- Paso 6: Asegurar índice para consultas por mayorista
CREATE INDEX IF NOT EXISTS idx_preregistros_mayorista_mayorista_producto
  ON preregistros_mayorista(id_mayorista, id_producto);

-- Paso 7: Actualizar comentarios
COMMENT ON TABLE preregistros_mayorista IS 'Preregistros de productos para mayoristas (reutilizables todos los días)';
