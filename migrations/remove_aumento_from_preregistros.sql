-- ============================================================================
-- ELIMINAR CAMPO AUMENTO DE PREREGISTROS
-- ============================================================================
-- Este script elimina el campo "aumento" de las tablas preregistros_minorista
-- y preregistros_mayorista después de haber migrado los datos a las nuevas
-- tablas de ventas.
--
-- IMPORTANTE: Ejecutar este script SOLO después de:
-- 1. Crear las nuevas tablas (restructure_minoristas_mayoristas.sql)
-- 2. Migrar los datos existentes (migrate_aumento_to_ventas.sql)
-- 3. Verificar que la migración fue exitosa
-- ============================================================================

-- ============================================================================
-- PASO 1: VERIFICACIONES PREVIAS
-- ============================================================================

-- Verificar que las nuevas tablas existan y tengan datos migrados
DO $$
DECLARE
  v_registros_migrados_minoristas INTEGER;
  v_registros_migrados_mayoristas INTEGER;
  v_preregistros_con_aumento_minoristas INTEGER;
  v_preregistros_con_aumento_mayoristas INTEGER;
BEGIN
  -- Verificar que las nuevas tablas existan
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_minoristas') THEN
    RAISE EXCEPTION 'La tabla ventas_minoristas no existe. Ejecuta primero restructure_minoristas_mayoristas.sql';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_mayoristas') THEN
    RAISE EXCEPTION 'La tabla ventas_mayoristas no existe. Ejecuta primero restructure_minoristas_mayoristas.sql';
  END IF;
  
  -- Verificar que el campo aumento existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'preregistros_minorista' AND column_name = 'aumento'
  ) THEN
    RAISE NOTICE 'El campo aumento ya no existe en preregistros_minorista. No es necesario eliminarlo.';
    RETURN;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'preregistros_mayorista' AND column_name = 'aumento'
  ) THEN
    RAISE NOTICE 'El campo aumento ya no existe en preregistros_mayorista. No es necesario eliminarlo.';
    RETURN;
  END IF;
  
  -- Contar preregistros con aumento
  SELECT COUNT(*) INTO v_preregistros_con_aumento_minoristas
  FROM preregistros_minorista
  WHERE aumento > 0;
  
  SELECT COUNT(*) INTO v_preregistros_con_aumento_mayoristas
  FROM preregistros_mayorista
  WHERE aumento > 0;
  
  -- Contar registros migrados
  SELECT COUNT(*) INTO v_registros_migrados_minoristas
  FROM ventas_minoristas
  WHERE observaciones LIKE 'Migrado desde preregistros_minorista.aumento%';
  
  SELECT COUNT(*) INTO v_registros_migrados_mayoristas
  FROM ventas_mayoristas
  WHERE observaciones LIKE 'Migrado desde preregistros_mayorista.aumento%';
  
  -- Advertencia si hay preregistros con aumento que no se migraron
  IF v_preregistros_con_aumento_minoristas > 0 AND v_preregistros_con_aumento_minoristas != v_registros_migrados_minoristas THEN
    RAISE WARNING 'ATENCIÓN: Hay % preregistros minoristas con aumento pero solo % fueron migrados. Verifica antes de continuar.',
      v_preregistros_con_aumento_minoristas, v_registros_migrados_minoristas;
  END IF;
  
  IF v_preregistros_con_aumento_mayoristas > 0 AND v_preregistros_con_aumento_mayoristas != v_registros_migrados_mayoristas THEN
    RAISE WARNING 'ATENCIÓN: Hay % preregistros mayoristas con aumento pero solo % fueron migrados. Verifica antes de continuar.',
      v_preregistros_con_aumento_mayoristas, v_registros_migrados_mayoristas;
  END IF;
  
  RAISE NOTICE 'Verificaciones completadas. Procediendo a eliminar campo aumento...';
END $$;

-- ============================================================================
-- PASO 2: ELIMINAR CAMPO AUMENTO
-- ============================================================================

-- Eliminar campo aumento de preregistros_minorista
ALTER TABLE preregistros_minorista 
DROP COLUMN IF EXISTS aumento;

-- Eliminar campo aumento de preregistros_mayorista
ALTER TABLE preregistros_mayorista 
DROP COLUMN IF EXISTS aumento;

-- ============================================================================
-- PASO 3: VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  v_campo_existe_minorista BOOLEAN;
  v_campo_existe_mayorista BOOLEAN;
BEGIN
  -- Verificar que el campo fue eliminado
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'preregistros_minorista' AND column_name = 'aumento'
  ) INTO v_campo_existe_minorista;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'preregistros_mayorista' AND column_name = 'aumento'
  ) INTO v_campo_existe_mayorista;
  
  IF v_campo_existe_minorista THEN
    RAISE WARNING 'El campo aumento aún existe en preregistros_minorista';
  ELSE
    RAISE NOTICE '✓ Campo aumento eliminado exitosamente de preregistros_minorista';
  END IF;
  
  IF v_campo_existe_mayorista THEN
    RAISE WARNING 'El campo aumento aún existe en preregistros_mayorista';
  ELSE
    RAISE NOTICE '✓ Campo aumento eliminado exitosamente de preregistros_mayorista';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migración completada exitosamente';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
