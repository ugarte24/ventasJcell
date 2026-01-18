-- ============================================================================
-- MIGRACIÓN: MOVER AUMENTOS DE PREREGISTROS A TABLAS DE VENTAS
-- ============================================================================
-- Este script migra los datos del campo "aumento" de preregistros_minorista
-- y preregistros_mayorista a las nuevas tablas ventas_minoristas y 
-- ventas_mayoristas respectivamente.
--
-- IMPORTANTE: Ejecutar este script DESPUÉS de crear las nuevas tablas
-- (restructure_minoristas_mayoristas.sql) pero ANTES de eliminar el campo
-- "aumento" de preregistros.
-- ============================================================================

-- ============================================================================
-- PASO 1: VERIFICACIONES PREVIAS
-- ============================================================================

-- Verificar que las nuevas tablas existan
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_minoristas') THEN
    RAISE EXCEPTION 'La tabla ventas_minoristas no existe. Ejecuta primero restructure_minoristas_mayoristas.sql';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas_mayoristas') THEN
    RAISE EXCEPTION 'La tabla ventas_mayoristas no existe. Ejecuta primero restructure_minoristas_mayoristas.sql';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'preregistros_minorista' AND column_name = 'aumento'
  ) THEN
    RAISE NOTICE 'El campo aumento ya no existe en preregistros_minorista. La migración puede no ser necesaria.';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'preregistros_mayorista' AND column_name = 'aumento'
  ) THEN
    RAISE NOTICE 'El campo aumento ya no existe en preregistros_mayorista. La migración puede no ser necesaria.';
  END IF;
END $$;

-- ============================================================================
-- PASO 2: CREAR TABLA TEMPORAL PARA BACKUP
-- ============================================================================

-- Crear tabla temporal para backup de datos antes de migrar
CREATE TEMP TABLE IF NOT EXISTS backup_aumentos_minoristas AS
SELECT 
  id,
  id_minorista,
  id_producto,
  aumento,
  fecha,
  created_at,
  updated_at
FROM preregistros_minorista
WHERE aumento > 0;

CREATE TEMP TABLE IF NOT EXISTS backup_aumentos_mayoristas AS
SELECT 
  id,
  id_mayorista,
  id_producto,
  aumento,
  fecha,
  created_at,
  updated_at
FROM preregistros_mayorista
WHERE aumento > 0;

-- ============================================================================
-- PASO 3: FUNCIÓN PARA BUSCAR PEDIDO ENTREGADO RELACIONADO
-- ============================================================================

-- Función auxiliar para encontrar pedido entregado relacionado con un aumento
CREATE OR REPLACE FUNCTION encontrar_pedido_entregado_aumento(
  p_id_usuario UUID,
  p_id_producto UUID,
  p_fecha DATE,
  p_tipo_usuario VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_pedido_id UUID;
BEGIN
  -- Buscar pedido entregado del mismo usuario, con el mismo producto, 
  -- entregado en la misma fecha o fecha cercana (hasta 7 días después)
  SELECT p.id INTO v_pedido_id
  FROM pedidos p
  JOIN detalle_pedidos dp ON p.id = dp.id_pedido
  WHERE p.id_usuario = p_id_usuario
    AND p.tipo_usuario = p_tipo_usuario
    AND p.estado = 'entregado'
    AND dp.id_producto = p_id_producto
    AND p.fecha_entrega >= p_fecha
    AND p.fecha_entrega <= p_fecha + INTERVAL '7 days'
  ORDER BY p.fecha_entrega ASC
  LIMIT 1;
  
  RETURN v_pedido_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 4: MIGRAR AUMENTOS DE MINORISTAS
-- ============================================================================

DO $$
DECLARE
  v_preregistro RECORD;
  v_precio_unitario NUMERIC;
  v_pedido_id UUID;
  v_hora TIME;
  v_contador INTEGER := 0;
  v_errores INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando migración de aumentos de minoristas...';
  
  -- Iterar sobre preregistros con aumento > 0
  FOR v_preregistro IN 
    SELECT 
      pm.id,
      pm.id_minorista,
      pm.id_producto,
      pm.aumento,
      pm.fecha,
      pm.created_at,
      pm.updated_at
    FROM preregistros_minorista pm
    WHERE pm.aumento > 0
    ORDER BY pm.fecha, pm.created_at
  LOOP
    BEGIN
      -- Obtener precio por unidad del producto
      SELECT precio_por_unidad INTO v_precio_unitario
      FROM productos
      WHERE id = v_preregistro.id_producto;
      
      -- Si no hay precio, usar 0
      IF v_precio_unitario IS NULL THEN
        v_precio_unitario := 0;
        RAISE WARNING 'Producto % no tiene precio_por_unidad, usando 0', v_preregistro.id_producto;
      END IF;
      
      -- Buscar pedido entregado relacionado
      v_pedido_id := encontrar_pedido_entregado_aumento(
        v_preregistro.id_minorista,
        v_preregistro.id_producto,
        v_preregistro.fecha,
        'minorista'
      );
      
      -- Usar hora del created_at o hora actual
      v_hora := COALESCE(
        (v_preregistro.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/La_Paz')::TIME,
        CURRENT_TIME
      );
      
      -- Insertar en ventas_minoristas
      INSERT INTO ventas_minoristas (
        id_minorista,
        id_producto,
        cantidad_vendida,
        cantidad_aumento,
        precio_unitario,
        total,
        fecha,
        hora,
        id_pedido,
        observaciones,
        created_at,
        updated_at
      ) VALUES (
        v_preregistro.id_minorista,
        v_preregistro.id_producto,
        0, -- cantidad_vendida = 0 (solo es un aumento)
        v_preregistro.aumento,
        v_precio_unitario,
        v_preregistro.aumento * v_precio_unitario, -- total calculado
        v_preregistro.fecha,
        v_hora,
        v_pedido_id, -- NULL si no se encuentra pedido
        'Migrado desde preregistros_minorista.aumento',
        v_preregistro.created_at,
        v_preregistro.updated_at
      );
      
      v_contador := v_contador + 1;
      
      -- Log cada 100 registros
      IF v_contador % 100 = 0 THEN
        RAISE NOTICE 'Migrados % registros de minoristas...', v_contador;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        v_errores := v_errores + 1;
        RAISE WARNING 'Error al migrar preregistro minorista %: %', v_preregistro.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Migración de minoristas completada: % registros migrados, % errores', v_contador, v_errores;
END $$;

-- ============================================================================
-- PASO 5: MIGRAR AUMENTOS DE MAYORISTAS
-- ============================================================================

DO $$
DECLARE
  v_preregistro RECORD;
  v_precio_por_mayor NUMERIC;
  v_pedido_id UUID;
  v_hora TIME;
  v_contador INTEGER := 0;
  v_errores INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando migración de aumentos de mayoristas...';
  
  -- Iterar sobre preregistros con aumento > 0
  FOR v_preregistro IN 
    SELECT 
      pm.id,
      pm.id_mayorista,
      pm.id_producto,
      pm.aumento,
      pm.fecha,
      pm.created_at,
      pm.updated_at
    FROM preregistros_mayorista pm
    WHERE pm.aumento > 0
    ORDER BY pm.fecha, pm.created_at
  LOOP
    BEGIN
      -- Obtener precio por mayor del producto
      SELECT precio_por_mayor INTO v_precio_por_mayor
      FROM productos
      WHERE id = v_preregistro.id_producto;
      
      -- Si no hay precio por mayor, usar 0
      IF v_precio_por_mayor IS NULL THEN
        v_precio_por_mayor := 0;
        RAISE WARNING 'Producto % no tiene precio_por_mayor, usando 0', v_preregistro.id_producto;
      END IF;
      
      -- Buscar pedido entregado relacionado
      v_pedido_id := encontrar_pedido_entregado_aumento(
        v_preregistro.id_mayorista,
        v_preregistro.id_producto,
        v_preregistro.fecha,
        'mayorista'
      );
      
      -- Usar hora del created_at o hora actual
      v_hora := COALESCE(
        (v_preregistro.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/La_Paz')::TIME,
        CURRENT_TIME
      );
      
      -- Insertar en ventas_mayoristas
      INSERT INTO ventas_mayoristas (
        id_mayorista,
        id_producto,
        cantidad_vendida,
        cantidad_aumento,
        precio_por_mayor,
        total,
        fecha,
        hora,
        id_pedido,
        observaciones,
        created_at,
        updated_at
      ) VALUES (
        v_preregistro.id_mayorista,
        v_preregistro.id_producto,
        0, -- cantidad_vendida = 0 (solo es un aumento)
        v_preregistro.aumento,
        v_precio_por_mayor,
        v_preregistro.aumento * v_precio_por_mayor, -- total calculado
        v_preregistro.fecha,
        v_hora,
        v_pedido_id, -- NULL si no se encuentra pedido
        'Migrado desde preregistros_mayorista.aumento',
        v_preregistro.created_at,
        v_preregistro.updated_at
      );
      
      v_contador := v_contador + 1;
      
      -- Log cada 100 registros
      IF v_contador % 100 = 0 THEN
        RAISE NOTICE 'Migrados % registros de mayoristas...', v_contador;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        v_errores := v_errores + 1;
        RAISE WARNING 'Error al migrar preregistro mayorista %: %', v_preregistro.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Migración de mayoristas completada: % registros migrados, % errores', v_contador, v_errores;
END $$;

-- ============================================================================
-- PASO 6: VERIFICACIÓN Y REPORTE
-- ============================================================================

-- Reporte de migración
DO $$
DECLARE
  v_total_minoristas INTEGER;
  v_total_mayoristas INTEGER;
  v_migrados_minoristas INTEGER;
  v_migrados_mayoristas INTEGER;
  v_con_pedido_minoristas INTEGER;
  v_con_pedido_mayoristas INTEGER;
BEGIN
  -- Contar preregistros con aumento
  SELECT COUNT(*) INTO v_total_minoristas
  FROM preregistros_minorista
  WHERE aumento > 0;
  
  SELECT COUNT(*) INTO v_total_mayoristas
  FROM preregistros_mayorista
  WHERE aumento > 0;
  
  -- Contar registros migrados
  SELECT COUNT(*) INTO v_migrados_minoristas
  FROM ventas_minoristas
  WHERE observaciones LIKE 'Migrado desde preregistros_minorista.aumento%';
  
  SELECT COUNT(*) INTO v_migrados_mayoristas
  FROM ventas_mayoristas
  WHERE observaciones LIKE 'Migrado desde preregistros_mayorista.aumento%';
  
  -- Contar registros con pedido asociado
  SELECT COUNT(*) INTO v_con_pedido_minoristas
  FROM ventas_minoristas
  WHERE observaciones LIKE 'Migrado desde preregistros_minorista.aumento%'
    AND id_pedido IS NOT NULL;
  
  SELECT COUNT(*) INTO v_con_pedido_mayoristas
  FROM ventas_mayoristas
  WHERE observaciones LIKE 'Migrado desde preregistros_mayorista.aumento%'
    AND id_pedido IS NOT NULL;
  
  -- Mostrar reporte
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REPORTE DE MIGRACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MINORISTAS:';
  RAISE NOTICE '  - Preregistros con aumento: %', v_total_minoristas;
  RAISE NOTICE '  - Registros migrados: %', v_migrados_minoristas;
  RAISE NOTICE '  - Con pedido asociado: %', v_con_pedido_minoristas;
  RAISE NOTICE '  - Sin pedido asociado: %', v_migrados_minoristas - v_con_pedido_minoristas;
  RAISE NOTICE '';
  RAISE NOTICE 'MAYORISTAS:';
  RAISE NOTICE '  - Preregistros con aumento: %', v_total_mayoristas;
  RAISE NOTICE '  - Registros migrados: %', v_migrados_mayoristas;
  RAISE NOTICE '  - Con pedido asociado: %', v_con_pedido_mayoristas;
  RAISE NOTICE '  - Sin pedido asociado: %', v_migrados_mayoristas - v_con_pedido_mayoristas;
  RAISE NOTICE '========================================';
  
  -- Verificar que todos se migraron
  IF v_total_minoristas != v_migrados_minoristas THEN
    RAISE WARNING 'ATENCIÓN: No todos los aumentos de minoristas se migraron. Esperados: %, Migrados: %', 
      v_total_minoristas, v_migrados_minoristas;
  END IF;
  
  IF v_total_mayoristas != v_migrados_mayoristas THEN
    RAISE WARNING 'ATENCIÓN: No todos los aumentos de mayoristas se migraron. Esperados: %, Migrados: %', 
      v_total_mayoristas, v_migrados_mayoristas;
  END IF;
END $$;

-- ============================================================================
-- PASO 7: SCRIPT DE ROLLBACK (OPCIONAL - COMENTADO)
-- ============================================================================

/*
-- Si necesitas hacer rollback, ejecuta este script:
-- NOTA: Esto eliminará los registros migrados

DELETE FROM ventas_minoristas 
WHERE observaciones LIKE 'Migrado desde preregistros_minorista.aumento%';

DELETE FROM ventas_mayoristas 
WHERE observaciones LIKE 'Migrado desde preregistros_mayorista.aumento%';

-- Los datos originales están en las tablas temporales backup_aumentos_minoristas
-- y backup_aumentos_mayoristas (si aún están en la sesión)
*/

-- ============================================================================
-- FIN DEL SCRIPT DE MIGRACIÓN
-- ============================================================================
-- Después de ejecutar este script y verificar que todo está correcto,
-- puedes proceder a eliminar el campo "aumento" de preregistros ejecutando:
--
-- ALTER TABLE preregistros_minorista DROP COLUMN IF EXISTS aumento;
-- ALTER TABLE preregistros_mayorista DROP COLUMN IF EXISTS aumento;
-- ============================================================================
