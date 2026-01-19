-- ============================================================================
-- ELIMINAR CAMPO AUMENTO DE PREREGISTROS (EJECUTAR EN SUPABASE)
-- ============================================================================
-- Este script elimina el campo "aumento" de las tablas preregistros_minorista
-- y preregistros_mayorista, ya que los aumentos ahora se registran en las
-- tablas ventas_minoristas y ventas_mayoristas.
-- 
-- IMPORTANTE: Este script debe ejecutarse directamente en el SQL Editor de Supabase
-- ============================================================================

-- Verificar si el campo existe y mostrar información
DO $$
BEGIN
  -- Verificar preregistros_minorista
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'preregistros_minorista' 
    AND column_name = 'aumento'
  ) THEN
    RAISE NOTICE 'Campo "aumento" encontrado en preregistros_minorista. Eliminando...';
  ELSE
    RAISE NOTICE 'Campo "aumento" NO existe en preregistros_minorista.';
  END IF;

  -- Verificar preregistros_mayorista
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'preregistros_mayorista' 
    AND column_name = 'aumento'
  ) THEN
    RAISE NOTICE 'Campo "aumento" encontrado en preregistros_mayorista. Eliminando...';
  ELSE
    RAISE NOTICE 'Campo "aumento" NO existe en preregistros_mayorista.';
  END IF;
END $$;

-- Eliminar columna aumento de preregistros_minorista
ALTER TABLE preregistros_minorista 
DROP COLUMN IF EXISTS aumento;

-- Eliminar columna aumento de preregistros_mayorista
ALTER TABLE preregistros_mayorista 
DROP COLUMN IF EXISTS aumento;

-- Verificar que se eliminaron correctamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'preregistros_minorista' 
    AND column_name = 'aumento'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'preregistros_mayorista' 
    AND column_name = 'aumento'
  ) THEN
    RAISE NOTICE '✓ Campo "aumento" eliminado exitosamente de ambas tablas.';
  ELSE
    RAISE WARNING 'Algunas columnas "aumento" podrían seguir existiendo. Verificar manualmente.';
  END IF;
END $$;

-- Mostrar estructura final de las tablas
SELECT 
    'preregistros_minorista' as tabla,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'preregistros_minorista'
ORDER BY ordinal_position;

SELECT 
    'preregistros_mayorista' as tabla,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'preregistros_mayorista'
ORDER BY ordinal_position;
