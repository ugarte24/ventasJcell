-- Migración: Renombrar monto_transaccionado a total en registros_servicios
-- También asegurar que monto_aumentado se guarde correctamente

-- ============================================
-- 1. RENOMBRAR COLUMNA monto_transaccionado A total
-- ============================================
ALTER TABLE registros_servicios 
RENAME COLUMN monto_transaccionado TO total;

-- ============================================
-- 2. ACTUALIZAR COMENTARIOS
-- ============================================
COMMENT ON COLUMN registros_servicios.total IS 'Total = saldo_inicial + monto_aumentado - saldo_final';

-- ============================================
-- 3. ACTUALIZAR FUNCIÓN calcular_monto_transaccionado
-- ============================================
CREATE OR REPLACE FUNCTION calcular_total(
  p_saldo_final NUMERIC,
  p_saldo_inicial NUMERIC,
  p_monto_aumentado NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  -- Fórmula: total = saldo_inicial + monto_aumentado - saldo_final
  RETURN p_saldo_inicial + p_monto_aumentado - p_saldo_final;
END;
$$ LANGUAGE plpgsql;

-- Eliminar la función antigua si existe
DROP FUNCTION IF EXISTS calcular_monto_transaccionado(NUMERIC, NUMERIC, NUMERIC);

-- ============================================
-- 4. ACTUALIZAR FUNCIÓN DEL TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION calcular_montos_registro_servicio()
RETURNS TRIGGER AS $$
DECLARE
  v_monto_aumentado_calculado NUMERIC;
BEGIN
  -- Si NEW.monto_aumentado es NULL, calcularlo. De lo contrario, respetar el valor proporcionado.
  IF NEW.monto_aumentado IS NULL THEN
    v_monto_aumentado_calculado := calcular_monto_aumentado(NEW.id_servicio, NEW.fecha);
    NEW.monto_aumentado := v_monto_aumentado_calculado;
  END IF;

  -- Calcular total usando el monto_aumentado (ya sea manual o calculado)
  NEW.total := calcular_total(
    NEW.saldo_final,
    NEW.saldo_inicial,
    NEW.monto_aumentado -- Usar el valor de NEW.monto_aumentado (manual o calculado)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. ACTUALIZAR REGISTROS EXISTENTES (opcional)
-- ============================================
-- Recalcular el total para todos los registros existentes
UPDATE registros_servicios
SET total = saldo_inicial + monto_aumentado - saldo_final
WHERE total IS NULL OR total != (saldo_inicial + monto_aumentado - saldo_final);

