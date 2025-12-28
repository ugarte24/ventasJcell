-- Migración: Agregar campo meses_credito y modificar cálculo de intereses
-- Fecha: 2025-01-XX

-- 1. Agregar campo meses_credito a la tabla ventas
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS meses_credito INTEGER;

-- 2. Actualizar registros existentes: calcular meses_credito desde fecha_vencimiento
UPDATE ventas
SET meses_credito = CEIL((fecha_vencimiento::date - fecha::date) / 30.0)
WHERE metodo_pago = 'credito' 
  AND fecha_vencimiento IS NOT NULL 
  AND meses_credito IS NULL;

-- 3. Eliminar función existente si existe (para evitar conflictos de parámetros)
DROP FUNCTION IF EXISTS calcular_interes_mensual(UUID);

-- 4. Crear función para calcular interés mes a mes
-- El interés se calcula multiplicando el total original por la tasa y por los meses transcurridos
CREATE FUNCTION calcular_interes_mensual(id_venta UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
  v_tasa_interes NUMERIC;
  v_fecha_venta DATE;
  v_fecha_actual DATE;
  v_meses_transcurridos INTEGER;
  v_interes NUMERIC;
  v_interes_eximido BOOLEAN;
BEGIN
  -- Obtener datos de la venta
  SELECT 
    total,
    COALESCE(tasa_interes, 0),
    fecha,
    interes_eximido
  INTO 
    v_total,
    v_tasa_interes,
    v_fecha_venta,
    v_interes_eximido
  FROM ventas
  WHERE id = id_venta;
  
  -- Si no se encuentra la venta o el interés está eximido, retornar 0
  IF v_total IS NULL OR v_interes_eximido THEN
    RETURN 0;
  END IF;
  
  -- Si no hay tasa de interés, retornar 0
  IF v_tasa_interes = 0 OR v_tasa_interes IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Fecha actual
  v_fecha_actual := CURRENT_DATE;
  
  -- Calcular meses transcurridos desde la fecha de la venta
  -- Usar diferencia en días y convertir a meses (aproximadamente 30 días por mes)
  v_meses_transcurridos := CEIL((v_fecha_actual - v_fecha_venta) / 30.0);
  
  -- El interés se calcula desde el primer mes (mínimo 1 mes)
  -- Si la venta es del día de hoy o anterior, se aplica al menos 1 mes de interés
  IF v_meses_transcurridos <= 0 THEN
    v_meses_transcurridos := 1;
  END IF;
  
  -- Calcular interés: Total * (tasa / 100) * meses_transcurridos
  -- Esto significa que cada mes se agrega el mismo interés sobre el total original
  v_interes := v_total * (v_tasa_interes / 100.0) * v_meses_transcurridos;
  
  RETURN ROUND(v_interes, 2);
END;
$$ LANGUAGE plpgsql;

-- 5. Actualizar trigger para usar la nueva función
CREATE OR REPLACE FUNCTION recalcular_interes_venta()
RETURNS TRIGGER AS $$
DECLARE
  v_monto_interes NUMERIC;
  v_total_con_interes NUMERIC;
BEGIN
  -- Solo procesar si es una venta a crédito
  IF NEW.metodo_pago = 'credito' THEN
    -- Calcular interés usando la función
    v_monto_interes := calcular_interes_mensual(NEW.id);
    
    -- Si no se puede calcular (porque NEW.id no existe aún en INSERT), calcular directamente
    IF v_monto_interes IS NULL AND TG_OP = 'INSERT' THEN
      -- Calcular directamente usando NEW
      IF NEW.interes_eximido OR COALESCE(NEW.tasa_interes, 0) = 0 THEN
        v_monto_interes := 0;
      ELSE
        DECLARE
          v_meses_transcurridos INTEGER;
        BEGIN
          v_meses_transcurridos := CEIL((CURRENT_DATE - NEW.fecha) / 30.0);
          -- El interés se calcula desde el primer mes (mínimo 1 mes)
          IF v_meses_transcurridos <= 0 THEN
            v_meses_transcurridos := 1;
          END IF;
          v_monto_interes := NEW.total * (NEW.tasa_interes / 100.0) * v_meses_transcurridos;
        END;
      END IF;
    END IF;
    
    -- Calcular total con interés
    IF NEW.interes_eximido THEN
      v_total_con_interes := NEW.total;
    ELSE
      v_total_con_interes := NEW.total + COALESCE(v_monto_interes, 0);
    END IF;
    
    -- Actualizar campos
    NEW.monto_interes := ROUND(COALESCE(v_monto_interes, 0), 2);
    NEW.total_con_interes := ROUND(v_total_con_interes, 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Recalcular intereses para todas las ventas a crédito existentes
UPDATE ventas
SET 
  monto_interes = calcular_interes_mensual(id),
  total_con_interes = CASE 
    WHEN interes_eximido THEN total
    ELSE total + COALESCE(calcular_interes_mensual(id), 0)
  END
WHERE metodo_pago = 'credito';

-- 7. Crear o reemplazar el trigger
DROP TRIGGER IF EXISTS trigger_recalcular_interes_venta ON ventas;

CREATE TRIGGER trigger_recalcular_interes_venta
    BEFORE INSERT OR UPDATE ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION recalcular_interes_venta();

-- 8. Agregar comentario al campo
COMMENT ON COLUMN ventas.meses_credito IS 'Cantidad de cuotas para el pago del crédito';

